using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Windows;

namespace AIHomeDashboard.Desktop;

public partial class MainWindow : Window
{
    private Process? _serverProcess;
    private int _port;

    public MainWindow()
    {
        InitializeComponent();
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            _port = FindAvailablePort();
            StartServer();
            var url = $"http://127.0.0.1:{_port}";
            await WaitForServerAsync(url);
            DashboardView.Source = new Uri(url);
            DashboardView.Visibility = Visibility.Visible;
            LoadingPanel.Visibility = Visibility.Collapsed;
        }
        catch (Exception ex)
        {
            StatusText.Text = ex.Message;
            MessageBox.Show(this, ex.Message, "AI Home Dashboard", MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }

    private static int FindAvailablePort(int start = 8765)
    {
        for (var port = start; port < start + 25; port++)
        {
            try
            {
                using var listener = new TcpListener(IPAddress.Loopback, port);
                listener.Start();
                return port;
            }
            catch (SocketException)
            {
            }
        }

        throw new InvalidOperationException("Could not find an available local port for AI Home Dashboard.");
    }

    private void StartServer()
    {
        var appDir = AppContext.BaseDirectory;
        var backendDir = Path.Combine(appDir, "backend");
        var serverExe = Path.Combine(backendDir, "AIHomeDashboardServer.exe");

        if (!File.Exists(serverExe))
        {
            throw new FileNotFoundException("Packaged dashboard server was not found.", serverExe);
        }

        Directory.CreateDirectory(Path.Combine(backendDir, "data"));
        Directory.CreateDirectory(Path.Combine(backendDir, "config"));

        var logsDir = Path.Combine(backendDir, "logs");
        Directory.CreateDirectory(logsDir);
        var stdoutPath = Path.Combine(logsDir, "server.out.log");
        var stderrPath = Path.Combine(logsDir, "server.err.log");

        var startInfo = new ProcessStartInfo
        {
            FileName = serverExe,
            WorkingDirectory = backendDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        startInfo.Environment["AI_DASHBOARD_PORT"] = _port.ToString();
        startInfo.Environment["AI_DASHBOARD_BASE_DIR"] = backendDir;

        _serverProcess = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
        _serverProcess.OutputDataReceived += (_, args) => AppendLog(stdoutPath, args.Data);
        _serverProcess.ErrorDataReceived += (_, args) => AppendLog(stderrPath, args.Data);
        _serverProcess.Start();
        _serverProcess.BeginOutputReadLine();
        _serverProcess.BeginErrorReadLine();
    }

    private static void AppendLog(string path, string? line)
    {
        if (line is null)
        {
            return;
        }

        try
        {
            File.AppendAllText(path, line + Environment.NewLine);
        }
        catch
        {
        }
    }

    private async Task WaitForServerAsync(string url)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };
        for (var attempt = 0; attempt < 90; attempt++)
        {
            if (_serverProcess?.HasExited == true)
            {
                throw new InvalidOperationException("The dashboard server exited before startup completed.");
            }

            try
            {
                using var response = await client.GetAsync($"{url}/health");
                if (response.IsSuccessStatusCode)
                {
                    return;
                }
            }
            catch
            {
            }

            await Task.Delay(500);
        }

        throw new TimeoutException("The dashboard server did not start in time.");
    }

    private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        try
        {
            if (_serverProcess is { HasExited: false })
            {
                _serverProcess.Kill(entireProcessTree: true);
                _serverProcess.Dispose();
            }
        }
        catch
        {
        }
    }
}
