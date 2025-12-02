import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Ad {
  id: string;
  name: string;
  placement: string;
  ad_code: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
}

const PLACEMENTS = [
  { value: "header", label: "Header" },
  { value: "sidebar", label: "Sidebar" },
  { value: "footer", label: "Footer" },
  { value: "in-content", label: "In Content" },
  { value: "before-comments", label: "Before Comments" },
  { value: "after-post", label: "After Post" },
];

const AdminMonetization = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    placement: "sidebar",
    ad_code: "",
    is_active: true,
    start_date: "",
    end_date: "",
    priority: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchAds();
  };

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast({ title: "Error fetching ads", variant: "destructive" });
    } else {
      setAds(data || []);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setSelectedAd(null);
    setFormData({
      name: "",
      placement: "sidebar",
      ad_code: "",
      is_active: true,
      start_date: "",
      end_date: "",
      priority: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (ad: Ad) => {
    setSelectedAd(ad);
    setFormData({
      name: ad.name,
      placement: ad.placement,
      ad_code: ad.ad_code,
      is_active: ad.is_active,
      start_date: ad.start_date ? ad.start_date.split("T")[0] : "",
      end_date: ad.end_date ? ad.end_date.split("T")[0] : "",
      priority: ad.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.ad_code.trim()) {
      toast({ title: "Name and Ad Code are required", variant: "destructive" });
      return;
    }

    const adData = {
      name: formData.name.trim(),
      placement: formData.placement,
      ad_code: formData.ad_code,
      is_active: formData.is_active,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      priority: formData.priority,
    };

    if (selectedAd) {
      const { error } = await supabase
        .from("ads")
        .update(adData)
        .eq("id", selectedAd.id);

      if (error) {
        toast({ title: "Failed to update ad", variant: "destructive" });
      } else {
        toast({ title: "Ad updated" });
        fetchAds();
      }
    } else {
      const { error } = await supabase.from("ads").insert(adData);

      if (error) {
        toast({ title: "Failed to create ad", variant: "destructive" });
      } else {
        toast({ title: "Ad created" });
        fetchAds();
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedAd) return;

    const { error } = await supabase.from("ads").delete().eq("id", selectedAd.id);

    if (error) {
      toast({ title: "Failed to delete ad", variant: "destructive" });
    } else {
      toast({ title: "Ad deleted" });
      fetchAds();
    }
    setDeleteDialogOpen(false);
    setSelectedAd(null);
  };

  const toggleActive = async (ad: Ad) => {
    const { error } = await supabase
      .from("ads")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      fetchAds();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Monetization</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" /> Add Ad
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {ads.filter((a) => a.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Placements Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(ads.map((a) => a.placement)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No ads configured yet.</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                Create Your First Ad
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">{ad.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PLACEMENTS.find((p) => p.value === ad.placement)?.label || ad.placement}
                      </Badge>
                    </TableCell>
                    <TableCell>{ad.priority}</TableCell>
                    <TableCell>
                      <Switch
                        checked={ad.is_active}
                        onCheckedChange={() => toggleActive(ad)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ad.start_date || ad.end_date ? (
                        <>
                          {ad.start_date && format(new Date(ad.start_date), "MMM d")}
                          {ad.start_date && ad.end_date && " - "}
                          {ad.end_date && format(new Date(ad.end_date), "MMM d")}
                        </>
                      ) : (
                        "Always"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(ad)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedAd(ad);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAd ? "Edit Ad" : "Create Ad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ad name"
                />
              </div>
              <div>
                <Label htmlFor="placement">Placement</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(value) => setFormData({ ...formData, placement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="ad_code">Ad Code (HTML/JavaScript)</Label>
              <Textarea
                id="ad_code"
                value={formData.ad_code}
                onChange={(e) => setFormData({ ...formData, ad_code: e.target.value })}
                placeholder="Paste your ad code here..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedAd?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminMonetization;
