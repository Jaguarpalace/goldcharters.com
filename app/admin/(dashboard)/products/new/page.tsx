import { ProductEditor } from '../[id]/ProductEditor';

export default function NewProductPage() {
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Add Product</span>
        <h1 className="font-display text-4xl text-white mt-2">New Piece</h1>
        <p className="mt-2 text-sm text-warmgrey">
          Create a new product listing. Connect Supabase to enable the save action and photo uploads.
        </p>
      </header>

      <ProductEditor mode="create" />
    </div>
  );
}
