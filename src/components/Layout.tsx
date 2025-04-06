
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { createBackup, restoreBackup, resetLastId } from "@/utils/dataStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [backupData, setBackupData] = useState("");
  const [restoreData, setRestoreData] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast({
      title: "Logged out successfully",
    });
  };

  const handleBackup = () => {
    const data = createBackup();
    setBackupData(data);
    setIsBackupDialogOpen(true);
  };

  const handleRestoreOpen = () => {
    setRestoreData("");
    setIsRestoreDialogOpen(true);
  };

  const handleRestore = () => {
    if (restoreData) {
      const success = restoreBackup(restoreData);
      if (success) {
        toast({
          title: "Restore successful",
          description: "Your data has been restored successfully."
        });
        setIsRestoreDialogOpen(false);
      } else {
        toast({
          title: "Restore failed",
          description: "Invalid backup data format.",
          variant: "destructive"
        });
      }
    }
  };

  const handleResetLastId = () => {
    const { lastSaleId, lastPurchaseId } = resetLastId();
    toast({
      title: "Reset Last IDs",
      description: `Sales ID: ${lastSaleId}, Purchase ID: ${lastPurchaseId}`
    });
  };

  const downloadBackup = () => {
    const blob = new Blob([backupData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kesari-auto-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Kesari Auto Center</h1>
            <span className="text-sm text-gray-500">Version 2.0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">User: {user.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
        <div className="flex mt-2 items-center">
          <nav className="flex-1">
            <ul className="flex space-x-4">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center px-4 py-2 hover:bg-gray-100 rounded ${location.pathname === '/' ? 'bg-gray-100' : ''}`}
                >
                  <img src="/lovable-uploads/a042c22e-13d4-4780-bbb5-108d2637b91e.png" alt="Sales" className="w-10 h-8 mr-2" />
                  <span>Sales</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/purchase" 
                  className={`flex items-center px-4 py-2 hover:bg-gray-100 rounded ${location.pathname === '/purchase' ? 'bg-gray-100' : ''}`}
                >
                  <img src="/lovable-uploads/a042c22e-13d4-4780-bbb5-108d2637b91e.png" alt="Purchase" className="w-10 h-8 mr-2" />
                  <span>Purchase</span>
                </Link>
              </li>
              <li>
                <Link 
                  to="/due-list" 
                  className={`flex items-center px-4 py-2 hover:bg-gray-100 rounded ${location.pathname === '/due-list' ? 'bg-gray-100' : ''}`}
                >
                  <img src="/lovable-uploads/a042c22e-13d4-4780-bbb5-108d2637b91e.png" alt="Due List" className="w-10 h-8 mr-2" />
                  <span>Due List</span>
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Tools</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white p-1">
                <DropdownMenuItem onClick={() => handleBackup()}>
                  Backup
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRestoreOpen()}>
                  Restore
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResetLastId()}>
                  Reset Last ID
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Option
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Backup Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Data</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <p className="mb-4">Your backup data is ready. You can copy it or download it as a file.</p>
            <div className="bg-gray-100 p-2 rounded-md max-h-40 overflow-auto">
              <pre className="text-xs">{backupData}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => downloadBackup()}>Download as File</Button>
            <Button onClick={() => setIsBackupDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Data</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <Label htmlFor="restore-data">Paste backup data below:</Label>
            <textarea
              id="restore-data"
              className="w-full h-40 p-2 border rounded-md mt-2"
              value={restoreData}
              onChange={(e) => setRestoreData(e.target.value)}
              placeholder="Paste your backup JSON data here..."
            />
          </div>
          <DialogFooter>
            <Button onClick={() => handleRestore()}>Restore</Button>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  function handleBackup() {
    const data = createBackup();
    setBackupData(data);
    setIsBackupDialogOpen(true);
  }

  function handleRestoreOpen() {
    setRestoreData("");
    setIsRestoreDialogOpen(true);
  }

  function handleRestore() {
    if (restoreData) {
      const success = restoreBackup(restoreData);
      if (success) {
        toast({
          title: "Restore successful",
          description: "Your data has been restored successfully."
        });
        setIsRestoreDialogOpen(false);
      } else {
        toast({
          title: "Restore failed",
          description: "Invalid backup data format.",
          variant: "destructive"
        });
      }
    }
  }

  function handleResetLastId() {
    const { lastSaleId, lastPurchaseId } = resetLastId();
    toast({
      title: "Reset Last IDs",
      description: `Sales ID: ${lastSaleId}, Purchase ID: ${lastPurchaseId}`
    });
  }

  function downloadBackup() {
    const blob = new Blob([backupData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kesari-auto-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

export default Layout;
