"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "../components/Navigation";

interface Intolerance {
  id: string;
  fields: {
    Name?: string;
    description?: string;
    severity_level?: string;
  };
}

export default function IntolerancesPage() {
  const [intolerances, setIntolerances] = useState<Intolerance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);

  // Fetch intolerances
  const fetchIntolerances = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/intolerances");
      if (!res.ok) throw new Error("Erreur lors du chargement des intolérances");
      const data = await res.json();
      setIntolerances(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erreur lors du chargement des intolérances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntolerances();
  }, []);

  // Add intolerance
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/intolerances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'ajout");
      const created = await res.json();
      setNewName("");
      toast.success("Intolérance ajoutée");
      setIntolerances((prev) => [created, ...prev]);
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  // Delete intolerance
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/intolerances?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Intolérance supprimée");
      fetchIntolerances();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  // Edit intolerance
  const startEdit = (intolerance: Intolerance) => {
    setEditingId(intolerance.id);
    setEditName(intolerance.fields.Name || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    try {
      const res = await fetch(`/api/intolerances?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error();
      setIntolerances((prev) => prev.map((intol) =>
        intol.id === id ? { ...intol, fields: { ...intol.fields, Name: editName.trim() } } : intol
      ));
      toast.success("Intolérance modifiée");
      cancelEdit();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container-modern section-padding max-w-4xl mx-auto">
        <h1 className="heading-xl gradient-text mb-8 text-center">Gestion des intolérances</h1>
        <Card className="modern-card mb-8">
          <CardHeader>
            <CardTitle>Ajouter une intolérance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-32 rounded-lg" />
              </div>
            ) : (
              <form className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-end" onSubmit={handleAdd}>
                <div className="flex-1 w-full">
                  <Input
                    id="name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Nom de l'intolérance"
                    required
                    className="w-full h-12"
                    disabled={adding}
                  />
                </div>
                <Button type="submit" className="h-12 min-w-[120px] flex items-center justify-center sm:self-end" disabled={adding}>
                  {adding ? (
                    <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>Ajout...</span>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Ajouter</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator className="mb-8" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          ) : intolerances.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">Aucune intolérance</div>
          ) : (
            intolerances.map((intolerance) => (
              <Card
                key={intolerance.id}
                className={`modern-card flex flex-row items-center justify-between p-3 transition-all duration-200 ${editingId === intolerance.id ? "ring-2 ring-primary/60 bg-slate-50" : ""}`}
              >
                {editingId === intolerance.id ? (
                  <div className="flex flex-row gap-1 w-full overflow-hidden items-center">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full min-w-0"
                      required
                      disabled={adding}
                      style={{ fontSize: '0.95rem', paddingLeft: 8, paddingRight: 8 }}
                    />
                    <Button variant="ghost" size="icon" onClick={cancelEdit} type="button" disabled={adding} aria-label="Annuler">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(intolerance.id)} type="button" disabled={adding} aria-label="Enregistrer">
                      {adding ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span> : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 items-center w-full">
                    <div className="flex-1 font-medium text-slate-900 truncate">{intolerance.fields.Name}</div>
                    {intolerance.fields.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">{intolerance.fields.description}</div>
                    )}
                    {intolerance.fields.severity_level && (
                      <div className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 capitalize">
                        {intolerance.fields.severity_level === 'mild' ? 'Légère' : intolerance.fields.severity_level === 'moderate' ? 'Modérée' : intolerance.fields.severity_level === 'severe' ? 'Sévère' : intolerance.fields.severity_level}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(intolerance)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Dialog open={openDialogId === intolerance.id} onOpenChange={(open) => setOpenDialogId(open ? intolerance.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <div className="text-center">
                            <p>
                              Supprimer l&apos;intolérance{" "}
                              <span className="font-semibold">{intolerance.fields.Name}</span> ?
                            </p>
                            <div className="flex justify-center gap-4 mt-6">
                              <Button
                                variant="outline"
                                onClick={async () => {
                                  await handleDelete(intolerance.id);
                                  setOpenDialogId(null);
                                }}
                                disabled={deletingId === intolerance.id}
                              >
                                {deletingId === intolerance.id ? (
                                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                                ) : (
                                  "Oui, supprimer"
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setDeletingId(null);
                                  setOpenDialogId(null);
                                }}
                                disabled={deletingId === intolerance.id}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
} 