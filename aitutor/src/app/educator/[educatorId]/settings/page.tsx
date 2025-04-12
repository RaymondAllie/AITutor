"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Trash2 } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";

interface EducatorProfile {
  id: string;
  name: string;
  email: string;
}

export default function EducatorSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const educatorId = params.educatorId as string || "1"; // Fallback for development
  
  const [profile, setProfile] = useState<EducatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  
  // Load student profile
  useEffect(() => {
    const fetchEducatorProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', educatorId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProfile(data);
          setName(data.name || "");
        }
      } catch (err: any) {
        console.error("Error fetching educator profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEducatorProfile();
  }, [educatorId]);
  
  const handleSaveProfile = async () => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name,
          updated_at: new Date().toISOString()
        })
        .eq('id', educatorId);
        
      if (error) throw error;
      
      alert("Your name has been updated successfully.");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', educatorId);
        
      if (error) throw error;
      
      alert("Your account has been deleted successfully.");
      router.push("/"); // Redirect to home page after deletion
    } catch (err: any) {
      console.error("Error deleting account:", err);
      alert(`Error deleting account: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Error Loading Settings</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your name or delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your full name"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            onClick={handleSaveProfile} 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Name
              </>
            )}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}

