using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading;
using System.Windows.Forms;
using Windows.ApplicationModel.DataTransfer;
using Windows.Foundation;
using Windows.Storage;

[ComImport, Guid("3A3DCD6C-3EAB-43DC-BCDE-45671CE800C8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IDataTransferManagerInterop
{
    IntPtr GetForWindow([In] IntPtr appWindow, [In] ref Guid riid);
    void ShowShareUIForWindow([In] IntPtr appWindow);
}

class ShareHelper : Form
{
    private readonly string[] filePaths;
    private List<IStorageItem> preloadedFiles;
    private static readonly Guid dtmIid = new Guid("a5caee9b-8708-49d1-8d36-67d25a8da00c");

    ShareHelper(string[] paths)
    {
        filePaths = paths;
        ShowInTaskbar = false;
        FormBorderStyle = FormBorderStyle.None;
        Opacity = 0;

        // Make form cover the full screen — Share dialog centers itself relative to owner
        var screen = Screen.PrimaryScreen.WorkingArea;
        StartPosition = FormStartPosition.Manual;
        Location = new System.Drawing.Point(screen.Left, screen.Top);
        Size = new System.Drawing.Size(screen.Width, screen.Height);
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        BeginInvoke(new Action(PreloadAndShare));
    }

    private void PreloadAndShare()
    {
        try
        {
            preloadedFiles = new List<IStorageItem>();
            var loadThread = new Thread(() =>
            {
                foreach (var filePath in filePaths)
                {
                    if (!File.Exists(filePath)) continue;
                    try
                    {
                        var mre = new ManualResetEvent(false);
                        StorageFile sf = null;
                        var op = StorageFile.GetFileFromPathAsync(filePath);
                        op.Completed = new AsyncOperationCompletedHandler<StorageFile>(
                            (info, status) =>
                            {
                                if (status == AsyncStatus.Completed)
                                    sf = info.GetResults();
                                mre.Set();
                            });
                        mre.WaitOne(10000);
                        if (sf != null) preloadedFiles.Add(sf);
                    }
                    catch { }
                }
            });
            loadThread.SetApartmentState(ApartmentState.MTA);
            loadThread.Start();
            loadThread.Join(15000);

            if (preloadedFiles.Count == 0)
            {
                Console.Error.WriteLine("No files could be loaded.");
                Close();
                return;
            }

            var dtmFactory = WindowsRuntimeMarshal.GetActivationFactory(typeof(DataTransferManager));
            var interop = (IDataTransferManagerInterop)dtmFactory;

            Guid iid = dtmIid;
            IntPtr pDtm = interop.GetForWindow(Handle, ref iid);
            var dtm = (DataTransferManager)Marshal.GetObjectForIUnknown(pDtm);
            Marshal.Release(pDtm);

            dtm.DataRequested += OnDataRequested;
            interop.ShowShareUIForWindow(Handle);

            // Auto-close after 2 minutes
            var closeTimer = new System.Windows.Forms.Timer();
            closeTimer.Interval = 120000;
            closeTimer.Tick += (s, ev) => { closeTimer.Stop(); Close(); };
            closeTimer.Start();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Error: " + ex.ToString());
            Close();
        }
    }

    private void OnDataRequested(DataTransferManager sender, DataRequestedEventArgs args)
    {
        var request = args.Request;
        try
        {
            request.Data.Properties.Title = "Share";
            request.Data.Properties.Description = string.Join(", ",
                Array.ConvertAll(filePaths, p => Path.GetFileName(p)));

            if (preloadedFiles != null && preloadedFiles.Count > 0)
            {
                request.Data.SetStorageItems(preloadedFiles, true);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("DataRequested error: " + ex.ToString());
            request.FailWithDisplayText("Share failed");
        }
    }

    [STAThread]
    static int Main(string[] args)
    {
        if (args.Length == 0) return 1;

        bool anyExists = false;
        foreach (var a in args)
            if (File.Exists(a)) { anyExists = true; break; }
        if (!anyExists) return 1;

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new ShareHelper(args));
        return 0;
    }
}
