using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Principal;
using System.Windows;
using SWF = System.Windows.Forms;

namespace AIHomeDashboard.Installer;

public partial class MainWindow : Window
{
    private const string AppDisplayName = "AI Home Dashboard";
    private const string ExeName = "AIHomeDashboard.exe";
    private const string PayloadResourceName = "AIHomeDashboardPayload.zip";

    public MainWindow()
    {
        InitializeComponent();
    }

    private void Window_Loaded(object sender, RoutedEventArgs e)
    {
        InstallPathTextBox.Text = GetDefaultInstallPath();
    }

    private void Scope_Changed(object sender, RoutedEventArgs e)
    {
        if (InstallPathTextBox is not null)
        {
            InstallPathTextBox.Text = GetDefaultInstallPath();
        }
    }

    private string GetDefaultInstallPath()
    {
        if (AllUsersRadio?.IsChecked == true)
        {
            var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            return Path.Combine(programFiles, "AIHomeDashboard");
        }

        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, "Programs", "AIHomeDashboard");
    }

    private void Browse_Click(object sender, RoutedEventArgs e)
    {
        using var dialog = new SWF.FolderBrowserDialog
        {
            Description = "Choose where to install AI Home Dashboard",
            SelectedPath = InstallPathTextBox.Text,
            UseDescriptionForTitle = true
        };

        if (dialog.ShowDialog() == SWF.DialogResult.OK)
        {
            InstallPathTextBox.Text = dialog.SelectedPath;
        }
    }

    private async void Install_Click(object sender, RoutedEventArgs e)
    {
        InstallButton.IsEnabled = false;
        try
        {
            var installPath = InstallPathTextBox.Text.Trim();
            if (string.IsNullOrWhiteSpace(installPath))
            {
                throw new InvalidOperationException("Choose an install location.");
            }

            if (AllUsersRadio.IsChecked == true && !IsAdministrator())
            {
                throw new InvalidOperationException("All-users install requires running this installer as Administrator.");
            }

            StatusText.Text = "Installing...";
            await Task.Run(() => InstallTo(installPath));

            if (StartMenuShortcutCheckBox.IsChecked == true)
            {
                CreateStartMenuShortcut(installPath);
            }

            if (DesktopShortcutCheckBox.IsChecked == true)
            {
                CreateDesktopShortcut(installPath);
            }

            StatusText.Text = $"Installed to {installPath}";

            if (LaunchAfterInstallCheckBox.IsChecked == true)
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = Path.Combine(installPath, ExeName),
                    WorkingDirectory = installPath,
                    UseShellExecute = true
                });
            }

            System.Windows.MessageBox.Show(this, "AI Home Dashboard was installed successfully.", AppDisplayName, MessageBoxButton.OK, MessageBoxImage.Information);
            Close();
        }
        catch (Exception ex)
        {
            StatusText.Text = ex.Message;
            System.Windows.MessageBox.Show(this, ex.Message, AppDisplayName, MessageBoxButton.OK, MessageBoxImage.Error);
            InstallButton.IsEnabled = true;
        }
    }

    private static void InstallTo(string installPath)
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), "AIHomeDashboardInstaller", Guid.NewGuid().ToString("N"));
        var payloadRoot = Path.Combine(tempRoot, "payload");

        try
        {
            Directory.CreateDirectory(payloadRoot);
            ExtractPayload(payloadRoot);
            CopyInstallTree(payloadRoot, installPath);
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempRoot))
                {
                    Directory.Delete(tempRoot, recursive: true);
                }
            }
            catch
            {
            }
        }
    }

    private static void ExtractPayload(string destination)
    {
        using var payloadStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(PayloadResourceName)
            ?? throw new InvalidOperationException("Installer payload is missing.");
        using var archive = new ZipArchive(payloadStream, ZipArchiveMode.Read);

        foreach (var entry in archive.Entries)
        {
            var targetPath = Path.GetFullPath(Path.Combine(destination, entry.FullName));
            var destinationRoot = Path.GetFullPath(destination) + Path.DirectorySeparatorChar;
            if (!targetPath.StartsWith(destinationRoot, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Installer payload contains an invalid path.");
            }

            if (string.IsNullOrEmpty(entry.Name))
            {
                Directory.CreateDirectory(targetPath);
                continue;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
            entry.ExtractToFile(targetPath, overwrite: true);
        }
    }

    private static void CopyInstallTree(string sourceDir, string installPath)
    {
        Directory.CreateDirectory(installPath);

        foreach (var sourcePath in Directory.EnumerateFileSystemEntries(sourceDir, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(sourceDir, sourcePath);
            var targetPath = Path.Combine(installPath, relativePath);
            var normalized = relativePath.Replace('/', '\\');

            if (Directory.Exists(sourcePath))
            {
                Directory.CreateDirectory(targetPath);
                continue;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);

            if (IsPreservedDataPath(normalized) && File.Exists(targetPath))
            {
                continue;
            }

            File.Copy(sourcePath, targetPath, overwrite: true);
        }
    }

    private static bool IsPreservedDataPath(string relativePath)
    {
        return relativePath.StartsWith(@"backend\data\", StringComparison.OrdinalIgnoreCase)
            || relativePath.StartsWith(@"backend\config\", StringComparison.OrdinalIgnoreCase);
    }

    private void CreateStartMenuShortcut(string installPath)
    {
        var programs = AllUsersRadio.IsChecked == true
            ? Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms)
            : Environment.GetFolderPath(Environment.SpecialFolder.Programs);
        CreateShortcut(Path.Combine(programs, $"{AppDisplayName}.lnk"), installPath);
    }

    private void CreateDesktopShortcut(string installPath)
    {
        var desktop = AllUsersRadio.IsChecked == true
            ? Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory)
            : Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        CreateShortcut(Path.Combine(desktop, $"{AppDisplayName}.lnk"), installPath);
    }

    private static void CreateShortcut(string shortcutPath, string installPath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(shortcutPath)!);
        var targetPath = Path.Combine(installPath, ExeName);
        var shellType = Type.GetTypeFromProgID("WScript.Shell") ?? throw new InvalidOperationException("WScript.Shell is not available.");
        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = targetPath;
        shortcut.WorkingDirectory = installPath;
        shortcut.Description = AppDisplayName;
        shortcut.IconLocation = $"{targetPath},0";
        shortcut.Save();
    }

    private static bool IsAdministrator()
    {
        using var identity = WindowsIdentity.GetCurrent();
        var principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
