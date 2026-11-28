import {getPublicCategories} from "@/lib/discovery/public-cache";
import CategoryExplorer, { type CategoryRecord } from "./CategoryExplorer";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Explore Business Categories in Sri Lanka | SL Business Index",
  description:
    "Explore Sri Lankan businesses by industry and service. Browse food, health, shopping, travel, technical services and more in one organized directory.",
};

async function getCategories(): Promise<CategoryRecord[]> {
  const snapshot=await getPublicCategories();
  return snapshot.rows as CategoryRecord[];
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return <CategoryExplorer categories={categories} />;
}
