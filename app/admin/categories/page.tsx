"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Tags,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  Filter,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

const ALL_LUCIDE_ICONS = Object.keys(LucideIcons).filter(
  (key) =>
    typeof (LucideIcons as any)[key] === "function" ||
    (typeof (LucideIcons as any)[key] === "object" && (LucideIcons as any)[key].$$typeof),
);

const COMMON_ICONS = [
  "Hotel",
  "Car",
  "Utensils",
  "Home",
  "Briefcase",
  "Heart",
  "User",
  "Factory",
  "Wrench",
  "Clapperboard",
  "Plane",
  "Palette",
  "Stethoscope",
  "Building",
  "Landmark",
  "Banknote",
  "Bus",
  "Hammer",
  "Phone",
  "Dog",
  "Tv",
  "ShoppingCart",
  "Dumbbell",
  "Rss",
  "Tractor",
  "Laptop",
  "School",
  "Baby",
  "Building2",
  "HardHat",
  "PiggyBank",
  "HeartPulse",
  "Plug",
  "Siren",
  "Shield",
  "Tags",
  "Image",
  "Layers",
  "Search",
  "Star",
  "MapPin",
  "Globe",
  "Clock",
  "Coffee",
  "Music",
  "Camera",
  "Book",
  "Gift",
  "Smile",
  "Sun",
  "Moon",
  "Cloud",
  "Mic",
  "Headphones",
  "Speaker",
  "Monitor",
  "Cpu",
  "Database",
  "Bell",
  "Flag",
  "Anchor",
  "Wind",
  "Zap",
  "Flame",
  "Droplet",
  "Leaf",
  "Flower2",
  "Sprout",
].sort();
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  parent_id: string | null;
  keywords: string[] | null;
  sort_order: number;
  created_at: string;
  subcategories?: Category[];
}

const MAIN_CATEGORY_GROUPS = [
  "Manpower Services",
  "Care & Lifestyle",
  "Professional & Finance",
  "Construction & Industrial",
  "Technical & Electronics",
  "Events Food & Leisure",
  "Travel & Transport",
  "Retail & Others",
];

const IconPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return COMMON_ICONS;
    return ALL_LUCIDE_ICONS.filter((icon) => icon.toLowerCase().includes(s)).slice(
      0,
      50,
    );
  }, [search]);

  const IconComponent = ({
    name,
    size = 18,
  }: {
    name: string;
    size?: number;
  }) => {
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon size={size} /> : <Tags size={size} />;
  };

  return (
    <div className="border border-gray-300 rounded-[6px] overflow-hidden bg-white shadow-sm">
      <div className="p-2 border-b border-gray-100 flex items-center bg-gray-50/50">
        <Search size={14} className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search all icons..."
          className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 p-2 max-h-48 overflow-y-auto custom-scrollbar">
        {filteredIcons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`p-2 rounded-[4px] flex items-center justify-center transition-all ${
              value === icon
                ? "bg-brand-dark text-white shadow-md scale-105"
                : "hover:bg-gray-100 text-gray-500"
            }`}
            title={icon}
          >
            <IconComponent name={icon} />
          </button>
        ))}
        {filteredIcons.length === 0 && (
          <div className="col-span-full py-4 text-center text-[10px] text-gray-400 italic">
            No icons found
          </div>
        )}
      </div>
    </div>
  );
};

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [filterLevel, setFilterLevel] = useState<"all" | "root" | "sub">("all");

  const {
    data: categories = [],
    isLoading: loading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Build hierarchy
      const categoryMap: Record<string, Category> = {};
      const rootCategories: Category[] = [];

      data.forEach((cat) => {
        categoryMap[cat.id] = { ...cat, subcategories: [] };
      });

      data.forEach((cat) => {
        if (cat.parent_id && categoryMap[cat.parent_id]) {
          categoryMap[cat.parent_id].subcategories.push(categoryMap[cat.id]);
        } else {
          rootCategories.push(categoryMap[cat.id]);
        }
      });

      return rootCategories;
    },
  });

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    icon: "",
    image_url: "",
    keywords: [] as string[],
    parent_id: null as string | null,
    keywordInput: "",
  });

  const [quickAddData, setQuickAddData] = useState({
    name: "",
    parent_id: "",
    icon: "Tags",
  });

  // Filter to find the 8 main parent categories for the quick add dropdown
  const mainParentCategories = useMemo(() => {
    return categories.filter(cat => 
      !cat.parent_id && MAIN_CATEGORY_GROUPS.includes(cat.name)
    );
  }, [categories]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `category-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("category-images")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddData.name || !quickAddData.parent_id) {
      toast.error("Please provide both name and parent category");
      return;
    }

    mutation.mutate({
      name: quickAddData.name,
      parent_id: quickAddData.parent_id,
      icon: quickAddData.icon,
      keywords: [],
    });

    setQuickAddData({ name: "", parent_id: quickAddData.parent_id, icon: "Tags" });
  };

  // Flattened categories for parent selection (excluding self and children if editing)
  const flatCategories = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const flatten = (cats: Category[], depth = 0) => {
      cats.forEach((cat) => {
        if (editingCategory && cat.id === editingCategory.id) return;
        list.push({ id: cat.id, name: `${"—".repeat(depth)} ${cat.name}` });
        if (cat.subcategories) flatten(cat.subcategories, depth + 1);
      });
    };
    flatten(categories);
    return list;
  }, [categories, editingCategory]);

  const mutation = useMutation({
    mutationFn: async (newData: Partial<Category>) => {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(newData)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        // Get max sort_order
        const { data: maxSort } = await supabase
          .from("categories")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1);

        const nextSort = (maxSort?[0]?.sort_order || 0) + 1;

        const { error } = await supabase
          .from("categories")
          .insert([{ ...newData, sort_order: nextSort }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setIsAddModalOpen(false);
      setEditingCategory(null);
      setParentCategory(null);
      setFormData({
        name: "",
        icon: "",
        image_url: "",
        keywords: [],
        parent_id: null,
        keywordInput: "",
      });
      toast.success(
        editingCategory
          ? "Category updated successfully"
          : "Category created successfully",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      id,
      parent_id,
    }: {
      id: string;
      parent_id: string | null;
    }) => {
      const { error } = await supabase
        .from("categories")
        .update({ parent_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category moved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      id,
      sort_order,
    }: {
      id: string;
      sort_order: number;
    }) => {
      const { error } = await supabase
        .from("categories")
        .update({ sort_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      icon: formData.icon || null,
      image_url: formData.image_url || null,
      keywords: formData.keywords,
      parent_id: formData.parent_id,
    };
    mutation.mutate(data);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || "",
      image_url: category.image_url || "",
      keywords: category.keywords || [],
      parent_id: category.parent_id,
      keywordInput: "",
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubcategory = (parent: Category) => {
    setParentCategory(parent);
    setEditingCategory(null);
    setFormData({
      name: "",
      icon: "",
      image_url: "",
      keywords: [],
      parent_id: parent.id,
      keywordInput: "",
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this category? All subcategories will also be deleted.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = useMemo(() => {
    let result = categories;

    if (filterLevel === "root") {
      // In hierarchy view, root categories are already at top level, but we clear subcategories for "root only"
      result = categories.map((cat) => ({ ...cat, subcategories: [] }));
    } else if (filterLevel === "sub") {
      // Show only categories that have a parent
      const getAllSubs = (cats: Category[]): Category[] => {
        return cats.reduce((acc: Category[], cat) => {
          const subs = cat.subcategories ? getAllSubs(cat.subcategories) : [];
          if (cat.parent_id) acc.push({ ...cat, subcategories: [] });
          return [...acc, ...subs];
        }, []);
      };
      result = getAllSubs(categories);
    }

    if (!search) return result;

    const filter = (cats: Category[]): Category[] => {
      return cats.reduce((acc: Category[], cat) => {
        const matches =
          cat.name.toLowerCase().includes(search.toLowerCase()) ||
          cat.keywords.some((k) =>
            k.toLowerCase().includes(search.toLowerCase()),
          );
        const subMatches = cat.subcategories ? filter(cat.subcategories) : [];

        if (matches || subMatches.length > 0) {
          acc.push({ ...cat, subcategories: subMatches });
        }
        return acc;
      }, []);
    };

    return filter(result);
  }, [categories, search, filterLevel]);

  const totalCategories = useMemo(() => {
    const count = (cats: Category[]): number => {
      return cats.reduce(
        (acc, cat) =>
          acc + 1 + (cat.subcategories ? count(cat.subcategories) : 0),
        0,
      );
    };
    return count(categories);
  }, [categories]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // For hierarchical view, we might want to select all flattened categories
      const getAllIds = (cats: Category[]): string[] => {
        return cats.reduce((acc: string[], cat) => {
          const subs = cat.subcategories ? getAllIds(cat.subcategories) : [];
          return [...acc, cat.id, ...subs];
        }, []);
      };
      setSelectedIds(getAllIds(filteredCategories));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} categories? All subcategories will also be deleted.`,
      )
    )
      return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .in("id", selectedIds);

    if (error) {
      toast.error("Error deleting categories");
    } else {
      setSelectedIds([]);
      toast.success("Selected categories deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    }
  };

  const IconComponent = ({
    name,
    size = 16,
    className = "",
  }: {
    name: string | null;
    size?: number;
    className?: string;
  }) => {
    if (!name) return <Tags size={size} className={className} />;
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
    return Icon ? (
      <Icon size={size} className={className} />
    ) : (
      <Tags size={size} className={className} />
    );
  };

  const CategoryRow = ({
    category,
    depth = 0,
    siblings = [],
  }: {
    category: Category;
    depth?: number;
    siblings?: Category[];
  }) => {
    const isExpanded = expandedCategories[category.id];
    const hasSubcategories =
      category.subcategories && category.subcategories.length > 0;
    const [isOver, setIsOver] = useState(false);

    const index = siblings.findIndex((s) => s.id === category.id);

    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData("categoryId", category.id);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsOver(true);
    };

    const handleDragLeave = () => {
      setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const draggedId = e.dataTransfer.getData("categoryId");

      if (draggedId && draggedId !== category.id) {
        moveMutation.mutate({ id: draggedId, parent_id: category.id });
      }
    };

    const moveOrder = (direction: "up" | "down") => {
      const otherIndex = direction === "up" ? index - 1 : index + 1;
      if (otherIndex < 0 || otherIndex >= siblings.length) return;

      const other = siblings[otherIndex];
      const currentSort = category.sort_order || 0;
      const otherSort = other.sort_order || 0;

      // Swap sort_orders
      reorderMutation.mutate({ id: category.id, sort_order: otherSort });
      reorderMutation.mutate({ id: other.id, sort_order: currentSort });
    };

    return (
      <>
        <tr
          className={`group transition-all duration-200 border-b border-gray-200 ${isOver ? "bg-brand-blue/5 scale-[1.005] shadow-sm" : selectedIds.includes(category.id) ? "bg-brand-blue/5" : "hover:bg-gray-50/50"}`}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <td className="px-8 py-6 w-10">
            <input
              type="checkbox"
              className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
              checked={selectedIds.includes(category.id)}
              onChange={() => handleSelectOne(category.id)}
            />
          </td>
          <td className="px-4 py-4 md:px-8 md:py-6">
            <div
              className="flex items-center gap-3 md:gap-4"
              style={{ paddingLeft: `${depth * (typeof window !== 'undefined' && window.innerWidth < 768 ? 16 : 32)}px` }}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="cursor-grab active:cursor-grabbing text-brand-blue group-hover:text-gray-300 p-1 md:p-1.5 hover:bg-white rounded transition-colors hidden sm:block">
                  <Layers size={14} />
                </div>
                {hasSubcategories ? (
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="p-1 md:p-1.5 hover:bg-white rounded shadow-sm border border-gray-300 transition-all flex items-center justify-center w-6 h-6 md:w-7 md:h-7"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-brand-blue" />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                ) : (
                  <div className="w-6 md:w-7" />
                )}
                <div
                  className={`h-9 w-9 md:h-11 md:w-11 relative rounded-[8px] md:rounded-[10px] border transition-all flex-shrink-0 flex items-center justify-center ${
                    isExpanded
                      ? "bg-brand-dark border-brand-dark shadow-lg scale-105 md:scale-110"
                      : "bg-white border-gray-200 group-hover:border-brand-sand shadow-sm"
                  }`}
                >
                  <IconComponent
                    name={category.icon}
                    size={16}
                    className={
                      isExpanded
                        ? "text-white"
                        : "text-gray-400 group-hover:text-brand-dark"
                    }
                  />
                </div>
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm truncate transition-colors font-medium ${isExpanded ? "text-brand-dark" : "text-brand-blue"}`}
                >
                  {category.name}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {category.keywords.slice(0, 2).map((kw) => (
                    <span
                      key={kw}
                      className="text-[8px] md:text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium uppercase tracking-wider"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </td>
          <td className="px-8 py-6 hidden lg:table-cell">
            <span className="text-xs text-gray-500 font-normal">
              {new Date(category.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </td>
          <td className="px-8 py-6">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  hasSubcategories
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
              >
                {category.subcategories.length || 0} Sub-items
              </span>
            </div>
          </td>
          <td className="px-8 py-6">
            <div className="flex items-center gap-1.5">
              <button
                disabled={index === 0}
                onClick={() => moveOrder("up")}
                className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-md text-gray-400 hover:text-brand-dark disabled:opacity-20 transition-all"
                title="Move Up"
              >
                <ChevronDown size={14} className="rotate-180" />
              </button>
              <button
                disabled={index === siblings.length - 1}
                onClick={() => moveOrder("down")}
                className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-md text-gray-400 hover:text-brand-dark disabled:opacity-20 transition-all"
                title="Move Down"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </td>
          <td className="px-8 py-6 text-right">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleAddSubcategory(category)}
                className="px-3 py-1.5 bg-brand-blue/5 hover:bg-brand-blue/10 border border-brand-blue/10 rounded-[4px] transition-all text-xs font-semibold text-brand-blue flex items-center gap-1.5"
              >
                <Plus size={14} /> Sub
              </button>
              <button
                onClick={() => handleEdit(category)}
                className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-[8px] transition-all text-gray-400 hover:text-brand-dark"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-[8px] transition-all outline-none hover:shadow-sm">
                  <MoreVertical size={16} className="text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border-gray-200 p-1.5 shadow-2xl rounded-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <DropdownMenuItem
                    onClick={() =>
                      moveMutation.mutate({ id: category.id, parent_id: null })
                    }
                    className="flex items-center gap-2.5 cursor-pointer py-3 px-3 text-[13px] font-medium focus:bg-gray-50 rounded-[8px] transition-colors"
                  >
                    <Layers size={14} className="text-gray-400" /> Move to Root
                    Level
                  </DropdownMenuItem>
                  <div className="h-px bg-gray-100 my-1" />
                  <DropdownMenuItem
                    onClick={() => handleDelete(category.id)}
                    className="flex items-center gap-2.5 cursor-pointer py-3 px-3 text-[13px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700 rounded-[8px] transition-colors"
                  >
                    <Trash2 size={14} /> Remove Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </td>
        </tr>
        {isExpanded &&
          category.subcategories.map((sub) => (
            <CategoryRow
              key={sub.id}
              category={sub}
              depth={depth + 1}
              siblings={category.subcategories}
            />
          ))}
      </>
    );
  };

  const MobileCategoryItem = ({
    category,
    depth = 0,
  }: {
    category: Category;
    depth?: number;
  }) => {
    const isExpanded = expandedCategories[category.id];
    const hasSubcategories =
      category.subcategories && category.subcategories.length > 0;

    return (
      <div className="flex flex-col">
        <div
          className={`p-4 flex items-center gap-3 transition-colors ${selectedIds.includes(category.id) ? "bg-brand-blue/5" : "bg-white"}`}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="checkbox"
              className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
              checked={selectedIds.includes(category.id)}
              onChange={() => handleSelectOne(category.id)}
            />
            {hasSubcategories ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="p-1 hover:bg-gray-100 rounded border border-gray-200 transition-all flex items-center justify-center w-6 h-6"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-brand-blue" />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>
          
          <div
            className="flex items-center gap-3 flex-1 min-w-0"
            style={{ paddingLeft: `${depth * 12}px` }}
          >
            <div className={`h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${isExpanded ? "bg-brand-dark border-brand-dark shadow-sm" : "bg-gray-50 border-gray-100"}`}>
              <IconComponent
                name={category.icon}
                size={16}
                className={isExpanded ? "text-white" : "text-gray-400"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${isExpanded ? "text-brand-dark" : "text-brand-blue"}`}>
                {category.name}
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                  {category.subcategories.length || 0} Sub-items
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all outline-none flex-shrink-0">
                <MoreVertical size={16} className="text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 bg-white border-gray-100 p-2 shadow-xl rounded-xl"
            >
              <DropdownMenuItem
                onClick={() => handleAddSubcategory(category)}
                className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer rounded-lg"
              >
                <Plus size={14} className="text-brand-blue" /> Add Subcategory
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(category)}
                className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer rounded-lg"
              >
                <Edit size={14} className="text-brand-dark" /> Edit Details
              </DropdownMenuItem>
              <div className="h-px bg-gray-100 my-1" />
              <DropdownMenuItem
                onClick={() => handleDelete(category.id)}
                className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer rounded-lg"
              >
                <Trash2 size={14} /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {isExpanded &&
          category.subcategories.map((sub) => (
            <MobileCategoryItem key={sub.id} category={sub} depth={depth + 1} />
          ))}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-50/30 transition-colors overflow-hidden">
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 py-6 md:py-10 min-w-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl text-gray-900 tracking-tight">
              Category Architecture
            </h1>
            <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">
              Design and organize your business taxonomy with multi-level
              nesting.{" "}
              <span className="text-brand-dark md:ml-2 block md:inline">
                {totalCategories} active categories
              </span>
            </p>
          </div>
        </div>

        {/* Quick Add Subcategory Form */}
        <div className="bg-white p-6 rounded-[6px] shadow-sm border border-gray-100 mb-8 md:mb-12">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Plus className="text-brand-blue" size={16} strokeWidth={3} />
            Quick Add Subcategory
          </h2>
          <form onSubmit={handleQuickAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parent Group</label>
              <div className="relative group">
                <select
                  value={quickAddData.parent_id}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, parent_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-[6px] px-3 py-2.5 text-xs md:text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-blue/10 focus:border-brand-blue appearance-none cursor-pointer hover:border-gray-300 transition-all shadow-sm"
                  required
                >
                  <option value="">Select Parent...</option>
                  {mainParentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subcategory Name</label>
              <input
                type="text"
                value={quickAddData.name}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., AC Technician"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition-all shadow-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Icon</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] text-xs md:text-sm text-gray-600 hover:bg-white transition-all shadow-sm">
                    <div className="flex items-center gap-2">
                      <IconComponent name={quickAddData.icon} size={16} />
                      <span>{quickAddData.icon}</span>
                    </div>
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-0 w-72 bg-white border-gray-200 shadow-2xl rounded-xl">
                  <div className="p-2 max-h-[300px] overflow-auto">
                    <IconPicker 
                      value={quickAddData.icon} 
                      onChange={(icon) => setQuickAddData(prev => ({ ...prev, icon }))} 
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-brand-blue text-white px-6 py-2.5 rounded-[6px] text-xs md:text-sm font-bold hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/10 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 whitespace-nowrap h-[42px]"
            >
              {mutation.isPending ? "Adding..." : "Add Category"}
            </button>
          </form>
        </div>

        {/* Professional Action Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-3 md:p-4 rounded-[6px] shadow-sm border border-gray-100 mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full lg:w-auto">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              <input
                type="text"
                placeholder="Search categories or keywords..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-[6px] text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative group w-full md:w-auto">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors pointer-events-none" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as "all" | "root" | "sub")}
                className="bg-white border border-gray-300 rounded-[6px] pl-10 pr-10 py-2 text-xs md:text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-blue/5 focus:border-brand-blue appearance-none cursor-pointer hover:border-gray-300 transition-all shadow-sm w-full md:min-w-[200px]"
              >
                <option value="all">Structure: All Levels</option>
                <option value="root">Structure: Root Only</option>
                <option value="sub">Structure: Sub-items Only</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={`p-2 md:p-2.5 text-gray-500 hover:text-brand-blue hover:bg-brand-blue/5 rounded-[6px] transition-all border border-gray-300 bg-white shadow-sm hover:border-brand-blue/20 ${isFetching ? "opacity-50" : "active:scale-95"}`}
              title="Refresh Data"
            >
              <RefreshCw
                className={`h-4 w-4 md:h-5 md:w-5 ${isFetching ? "animate-spin" : ""}`}
              />
            </button>

            <div className="h-8 w-px bg-gray-200 hidden lg:block" />

            <button
              onClick={() => {
                setEditingCategory(null);
                setParentCategory(null);
                setFormData({
                  name: "",
                  icon: "",
                  image_url: "",
                  keywords: [],
                  parent_id: null,
                  keywordInput: "",
                });
                setIsAddModalOpen(true);
              }}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-brand-dark text-white px-4 md:px-6 py-2 md:py-2.5 rounded-[6px] text-xs md:text-sm hover:bg-brand-dark transition-all shadow-lg shadow-brand-dark/10 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
              <Plus size={14} className="md:size-4" strokeWidth={3} />
              Add Category
            </button>
          </div>
        </div>

        {/* Categories Table/List View */}
        <div className="bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden relative">
          {selectedIds.length > 0 && (
            <div className="bg-brand-dark/5 border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="text-xs md:text-sm font-medium text-brand-dark">
                {selectedIds.length} <span className="hidden sm:inline">categories</span> selected
              </span>
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-red-50 text-red-600 px-3 md:px-4 py-1.5 rounded-[6px] text-[10px] md:text-xs font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                >
                  <Trash2 size={12} className="md:size-[14px]" /> <span className="hidden xs:inline">Delete Selected</span><span className="xs:hidden">Delete</span>
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[10px] md:text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          {queryError && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 md:px-6 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 bg-white/20 rounded-full p-1" />
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-bold">Connection Error</span>
                  <span className="text-[10px] md:text-[11px] opacity-90">
                    {(queryError as Error).message ||
                      "Failed to sync with database"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="bg-white text-red-600 px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-xs  hover:bg-gray-100 transition-colors shadow-sm"
              >
                Retry
              </button>
            </div>
          )}

          {loading && categories.length === 0 ? (
            <div className="p-4 md:p-8 space-y-4 md:space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 md:gap-6 items-center">
                  <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-lg" />
                  <Skeleton className="h-4 md:h-6 flex-1" />
                  <Skeleton className="h-4 md:h-6 w-20 md:w-32" />
                </div>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-20 md:py-32 bg-gray-50/50">
              <div className="h-16 w-16 md:h-20 md:w-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Tags
                  className="text-gray-200 h-8 w-8 md:h-10 md:w-10"
                  strokeWidth={1}
                />
              </div>
              <p className="text-gray-500 font-semibold text-base md:text-lg italic px-4">
                No categories found matching your criteria.
              </p>
              <button
                onClick={() => setSearch("")}
                className="mt-3 md:mt-4 text-brand-blue hover:underline font-bold text-xs md:text-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-200 border-b border-gray-300">
                      <th className="px-8 py-5 w-10">
                        <input
                          type="checkbox"
                          className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                          onChange={handleSelectAll}
                          checked={
                            selectedIds.length > 0 &&
                            selectedIds.length ===
                              (function getAllCount(cats: Category[]): number {
                                return cats.reduce(
                                  (acc, cat) =>
                                    acc +
                                    1 +
                                    (cat.subcategories
                                      ? getAllCount(cat.subcategories)
                                      : 0),
                                  0,
                                );
                              })(filteredCategories)
                          }
                        />
                      </th>
                      <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">
                        Structure & Details
                      </th>
                      <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em] hidden lg:table-cell">
                        Created
                      </th>
                      <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">
                        Hierarchy
                      </th>
                      <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">
                        Sort
                      </th>
                      <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em] text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCategories.map((category) => (
                      <CategoryRow
                        key={category.id}
                        category={category}
                        siblings={categories}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredCategories.map((category) => (
                  <MobileCategoryItem key={category.id} category={category} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Category Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="w-[95vw] max-w-lg bg-white border-gray-300">
            <DialogHeader>
              <DialogTitle className="text-xl font-normal text-gray-900">
                {editingCategory
                  ? "Edit Category"
                  : parentCategory
                    ? `Add Subcategory to ${parentCategory.name}`
                    : "Add New Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-xs font-normal text-gray-500 uppercase tracking-wider"
                >
                  Name
                </label>
                <input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Electronics"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="parent_id"
                  className="block text-xs font-normal text-gray-500 uppercase tracking-wider"
                >
                  Parent Category
                </label>
                <select
                  id="parent_id"
                  value={formData.parent_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parent_id: e.target.value || null,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-sm"
                >
                  <option value="">None (Root Category)</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="icon"
                  className="block text-xs font-normal text-gray-500 uppercase tracking-wider"
                >
                  Select Category Icon
                </label>
                <IconPicker
                  value={formData.icon}
                  onChange={(icon) =>
                    setFormData((prev) => ({ ...prev, icon }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label
                  className="block text-xs font-normal text-gray-500 uppercase tracking-wider"
                >
                  Category Branding Image
                </label>
                <div className="flex items-center gap-4 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-[6px] transition-all hover:bg-white hover:border-brand-blue/30 group">
                  <div className="h-16 w-16 bg-white rounded-[8px] border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {formData.image_url ? (
                      <>
                        <img
                          src={formData.image_url}
                          alt="Category preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="text-gray-300" size={24} />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Upload Category Banner or Icon Image</p>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-[4px] text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                      {isUploading ? (
                        <Loader2 size={14} className="animate-spin text-brand-blue" />
                      ) : (
                        <Upload size={14} className="text-brand-blue" />
                      )}
                      {isUploading ? "Uploading..." : "Choose Image"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: e.target.value,
                    }))
                  }
                  placeholder="Or paste external URL..."
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-[10px] text-gray-400 italic mt-2"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="keywords"
                  className="block text-xs font-normal text-gray-500 uppercase tracking-wider"
                >
                  Keywords
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-300 rounded-[6px] min-h-[40px]">
                  {formData.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 rounded-full text-xs text-gray-600"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            keywords: prev.keywords.filter((k) => k !== kw),
                          }))
                        }
                        className="hover:text-red-500"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="keywords"
                    value={formData.keywordInput}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        keywordInput: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = formData.keywordInput.trim();
                        if (val && !formData.keywords.includes(val)) {
                          setFormData((prev) => ({
                            ...prev,
                            keywords: [...prev.keywords, val],
                            keywordInput: "",
                          }));
                        }
                      }
                    }}
                    placeholder="Type and press Enter..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-[6px] text-sm font-normal hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-brand-dark hover:bg-brand-dark/90 text-white rounded-[6px] text-sm font-normal transition-colors disabled:opacity-50"
                >
                  {mutation.isPending
                    ? "Saving..."
                    : editingCategory
                      ? "Save Changes"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
