import { useState, useEffect } from "react";
import { LayoutDashboard, PackagePlus, PackageMinus, Database, FileText, Moon, Sun, UserPlus, ChevronUp, Loader2, LogOut, Users, Trash2, KeyRound, Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { NavLink } from "@/components/NavLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { addUser, getUsers, deleteUser, updatePassword, updateRole, UserRole, User } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Stock In", url: "/stock-in", icon: PackagePlus },
  { title: "Stock Out", url: "/stock-out", icon: PackageMinus },
  { title: "Master Data", url: "/master-data", icon: Database },
  { title: "Reports", url: "/reports", icon: FileText },
];

function formatLastLogin(dateStr?: string | null): string {
  if (!dateStr) return "Belum pernah login";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Online";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function isOnline(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 5 * 60000; // 5 minutes
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.username === "admin";
  const [accountOpen, setAccountOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("staff");

  // Password change
  const [passwordDialogUser, setPasswordDialogUser] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    const users = await getUsers();
    setMembers(users);
    setLoadingMembers(false);
  };

  useEffect(() => {
    if (membersOpen) fetchMembers();
  }, [membersOpen]);

  const handleRegister = async () => {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      toast({ title: "Error", description: "Semua kolom wajib diisi", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }
    setRegistering(true);
    try {
      const ok = await addUser(newUsername.trim(), newName.trim(), newPassword, newRole);
      if (ok) {
        toast({ title: "Berhasil", description: `User ${newName.trim()} berhasil didaftarkan` });
        setNewName(""); setNewUsername(""); setNewPassword(""); setNewRole("staff");
        setRegisterOpen(false);
      } else {
        toast({ title: "Error", description: "Username sudah digunakan", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Gagal mendaftarkan user", variant: "destructive" });
    }
    setRegistering(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    const ok = await deleteUser(deleteTarget.id);
    if (ok) {
      toast({ title: "Berhasil", description: `User ${deleteTarget.name} berhasil dihapus` });
      fetchMembers();
    } else {
      toast({ title: "Error", description: "Gagal menghapus user", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleChangePassword = async () => {
    if (!passwordDialogUser || !newPwd.trim()) return;
    if (newPwd.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }
    setChangingPwd(true);
    const ok = await updatePassword(passwordDialogUser.id, newPwd);
    if (ok) {
      toast({ title: "Berhasil", description: `Password ${passwordDialogUser.name} berhasil diubah` });
      setPasswordDialogUser(null);
      setNewPwd("");
    } else {
      toast({ title: "Error", description: "Gagal mengubah password", variant: "destructive" });
    }
    setChangingPwd(false);
  };

  const handleChangeRole = async (member: User, newRole: UserRole) => {
    const ok = await updateRole(member.id, newRole);
    if (ok) {
      toast({ title: "Berhasil", description: `Role ${member.name} diubah ke ${newRole}` });
      fetchMembers();
    } else {
      toast({ title: "Error", description: "Gagal mengubah role", variant: "destructive" });
    }
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">PrintStock</h1>
            <p className="text-xs text-muted-foreground">by @dispanart_</p>
          </div>
        </div>
      </div>

      <SidebarContent className="px-3 pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-lg">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Collapsible open={accountOpen} onOpenChange={setAccountOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-semibold text-primary">{user?.name?.[0] || "U"}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "staff"}</p>
              </div>
              <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform ${accountOpen ? "" : "rotate-180"}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-warning" />}
                <span className="text-sm text-foreground">Dark Mode</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>

            {isAdmin && (
              <>
                <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <Users className="h-4 w-4" /> Daftar Anggota
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Daftar Anggota</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {loadingMembers ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Belum ada anggota</p>
                      ) : (
                        members.map((m) => (
                          <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                  <span className="text-xs font-semibold text-primary">{m.name[0]}</span>
                                </div>
                                {isOnline(m.last_login) && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-safe border-2 border-card" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{m.name}</p>
                                <p className="text-xs text-muted-foreground">@{m.username}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {isOnline(m.last_login) ? (
                                    <span className="text-safe font-medium">● Online</span>
                                  ) : (
                                    formatLastLogin(m.last_login)
                                  )}
                                </p>
                              </div>

                              {/* Role badge or selector */}
                              {isSuperAdmin && m.id !== user?.id ? (
                                <Select value={m.role} onValueChange={(v) => handleChangeRole(m, v as UserRole)}>
                                  <SelectTrigger className="w-[90px] h-7 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                                  {m.role}
                                </Badge>
                              )}
                            </div>

                            {/* Action buttons */}
                            {m.id !== user?.id && (
                              <div className="flex gap-1 pl-11">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                                  onClick={() => { setPasswordDialogUser(m); setNewPwd(""); setShowNewPwd(false); }}
                                >
                                  <KeyRound className="h-3 w-3" /> Ganti Password
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget(m)}
                                >
                                  <Trash2 className="h-3 w-3" /> Hapus
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <UserPlus className="h-4 w-4" /> Daftarkan User Baru
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Daftarkan User Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Nama Lengkap</Label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 50))} placeholder="John Doe" maxLength={50} />
                      </div>
                      <div>
                        <Label>Username</Label>
                        <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value.slice(0, 30))} placeholder="johndoe" maxLength={30} />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value.slice(0, 50))} placeholder="Min. 6 karakter" maxLength={50} />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleRegister} className="w-full" disabled={registering}>
                        {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Daftarkan
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}

            <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-low hover:text-low" onClick={logout}>
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </SidebarFooter>

      {/* Change Password Dialog */}
      <Dialog open={!!passwordDialogUser} onOpenChange={(v) => !v && setPasswordDialogUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ganti Password - {passwordDialogUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Password Baru</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value.slice(0, 50))}
                  placeholder="Min. 6 karakter"
                  maxLength={50}
                />
                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleChangePassword} className="w-full" disabled={changingPwd || newPwd.length < 6}>
              {changingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget?.name}</strong> (@{deleteTarget?.username})? Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
