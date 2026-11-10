import { createClient } from "@/lib/supabase/server";
import CategoryExplorer, { type CategoryRecord } from "./CategoryExplorer";

export const revalidate = 300;

export const metadata = {
  title: "Explore Business Categories in Sri Lanka | SL Business Index",
  description:
    "Explore Sri Lankan businesses by industry and service. Browse food, health, shopping, travel, technical services and more in one organized directory.",
};

async function getCategories(): Promise<CategoryRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, parent_id")
    .order("name", { ascending: true });

  if (error) {
    console.error("Unable to load categories:", error.message);
    return [];
  }

  return (data ?? []) as CategoryRecord[];
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return <CategoryExplorer categories={categories} />;
}
