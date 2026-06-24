import { redirect } from "next/navigation";
import { AlertTriangle, PackageX, Boxes, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, projectScopeWhere } from "@/lib/rbac";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Variants at or below this many units are flagged "low stock".
const LOW_STOCK = 5;

export default async function InventoryPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/dashboard");

  const variants = await prisma.productVariant.findMany({
    where: { product: projectScopeWhere(user) },
    include: { product: { select: { name: true, project: { select: { name: true } } } } },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });

  const totalUnits = variants.reduce((s, v) => s + v.stock, 0);
  const outOfStock = variants.filter((v) => v.stock <= 0);
  const lowStock = variants.filter((v) => v.stock > 0 && v.stock <= LOW_STOCK);

  const statusBadge = (stock: number) =>
    stock <= 0 ? (
      <Badge variant="destructive">Out of stock</Badge>
    ) : stock <= LOW_STOCK ? (
      <Badge variant="secondary">Low ({stock})</Badge>
    ) : (
      <Badge variant="success">{stock} in stock</Badge>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Variant Inventory</h1>
        <p className="text-sm text-muted-foreground">Stock by colour across your products, with low and out-of-stock alerts.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Variants" value={String(variants.length)} icon={Layers} />
        <StatCard label="Units in Stock" value={String(totalUnits)} icon={Boxes} />
        <StatCard label="Low Stock" value={String(lowStock.length)} icon={AlertTriangle} />
        <StatCard label="Out of Stock" value={String(outOfStock.length)} icon={PackageX} />
      </div>

      {variants.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No variants yet. Add product variants from the Store page.</CardContent></Card>
      ) : (
        <>
          {(lowStock.length > 0 || outOfStock.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colour</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...outOfStock, ...lowStock].map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-border" style={{ backgroundColor: v.colorHex }} />
                            {v.name}
                          </span>
                        </TableCell>
                        <TableCell>{v.product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{v.product.project.name}</TableCell>
                        <TableCell className="text-right">{statusBadge(v.stock)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Stock by colour</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colour</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full ring-1 ring-border" style={{ backgroundColor: v.colorHex }} />
                          {v.name}
                        </span>
                      </TableCell>
                      <TableCell>{v.product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{v.product.project.name}</TableCell>
                      <TableCell className="text-muted-foreground">{v.sku ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{v.stock}</TableCell>
                      <TableCell className="text-right">{statusBadge(v.stock)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
