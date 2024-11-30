'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Search, Plus } from "lucide-react";
import { ref, onValue, set, remove } from "firebase/database";
import { database } from '@/lib/firebase';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: string;
}

export function ProductList() {
  const [products, setProducts] = useState<Service[]>([]);
  const [editingProduct, setEditingProduct] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const servicedetailsRef = ref(database, 'servicedetails');
    const unsubscribe = onValue(servicedetailsRef, (snapshot) => {
      const data = snapshot.val();
      const services: Service[] = [];
      for (const key in data) {
        services.push({ id: key, ...data[key] });
      }
      setProducts(services);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = (product: Service) => {
    setEditingProduct({ ...product });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingProduct) {
      const serviceRef = ref(database, `servicedetails/${editingProduct.id}`);
      set(serviceRef, {
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        createdAt: editingProduct.createdAt,
      });
      setIsDialogOpen(false);
      setEditingProduct(null);
    }
  };

  const handleDelete = (productId: string) => {
    const serviceRef = ref(database, `servicedetails/${productId}`);
    remove(serviceRef);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
        <Card className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
          <CardHeader className="bg-[#0a1963] text-white p-6">
            <CardTitle className="text-2xl font-bold">Product Management</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
              <Button
                className="bg-[#0a1963] hover:bg-[#0c1d7a] text-white w-full sm:w-auto"
                onClick={() => window.location.href = '/dashboard'}
              >
                <Plus className="mr-2 h-4 w-4" /> Add New Product
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{product.description}</TableCell>
                        <TableCell>Rs. {product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(product)}>
                              <Pencil className="h-4 w-4 text-[#0a1963]" />
                              <span className="sr-only">Edit {product.name}</span>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDelete(product.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Delete {product.name}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#0a1963]">Edit Product</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <Button onClick={handleSave} className="w-full bg-[#0a1963] hover:bg-[#0c1d7a] text-white">
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default ProductList;
