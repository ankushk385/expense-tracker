export interface Category {
  key: string;
  label: string;
  icon: string;
  iconSet: "Ionicons" | "MaterialCommunityIcons" | "Feather";
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { key: "food", label: "Food & Dining", icon: "restaurant", iconSet: "Ionicons", color: "#FF6B6B" },
  { key: "groceries", label: "Groceries", icon: "cart", iconSet: "Ionicons", color: "#FF9F43" },
  { key: "transport", label: "Transport", icon: "car", iconSet: "Ionicons", color: "#48CAE4" },
  { key: "shopping", label: "Shopping", icon: "bag", iconSet: "Ionicons", color: "#C77DFF" },
  { key: "health", label: "Health", icon: "medical", iconSet: "Ionicons", color: "#06D6A0" },
  { key: "entertainment", label: "Entertainment", icon: "film", iconSet: "Ionicons", color: "#FFD166" },
  { key: "utilities", label: "Utilities", icon: "flash", iconSet: "Ionicons", color: "#EF233C" },
  { key: "rent", label: "Rent", icon: "home", iconSet: "Ionicons", color: "#4CC9F0" },
  { key: "education", label: "Education", icon: "school", iconSet: "Ionicons", color: "#F72585" },
  { key: "travel", label: "Travel", icon: "airplane", iconSet: "Ionicons", color: "#7209B7" },
  { key: "personal", label: "Personal Care", icon: "person", iconSet: "Ionicons", color: "#4361EE" },
  { key: "other_expense", label: "Other", icon: "ellipsis-horizontal", iconSet: "Ionicons", color: "#888" },
];

export const INCOME_CATEGORIES: Category[] = [
  { key: "salary", label: "Salary", icon: "briefcase", iconSet: "Ionicons", color: "#2A9D8F" },
  { key: "freelance", label: "Freelance", icon: "laptop", iconSet: "Ionicons", color: "#48CAE4" },
  { key: "investment", label: "Investment", icon: "trending-up", iconSet: "Ionicons", color: "#06D6A0" },
  { key: "gift", label: "Gift", icon: "gift", iconSet: "Ionicons", color: "#F72585" },
  { key: "rental", label: "Rental Income", icon: "business", iconSet: "Ionicons", color: "#FFD166" },
  { key: "other_income", label: "Other", icon: "add-circle", iconSet: "Ionicons", color: "#888" },
];

export function getCategoryById(key: string): Category | undefined {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.key === key);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
