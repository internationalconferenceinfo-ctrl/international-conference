import React from "react";
import { Category } from "../shared/types";
import { Tag, Edit2, Trash2 } from "lucide-react";

interface CategoriesProps {
  categories: Category[];
  onAddCategory?: () => void;
  onEditCategory?: (cat: Category) => void;
  onDeleteCategory?: (id: string) => void;
}

export const Categories: React.FC<CategoriesProps> = ({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Manage Categories</h1>
          <p className="text-xs text-slate-500">Configure academic and industry conference categories</p>
        </div>
        <button
          onClick={onAddCategory}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
        >
          <Tag className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:shadow-xs transition-shadow">
            <div>
              <h3 className="font-bold text-xs text-slate-900">{cat.name}</h3>
              <p className="text-[10px] text-slate-400">{cat.slug}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEditCategory?.(cat)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDeleteCategory?.(cat.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
