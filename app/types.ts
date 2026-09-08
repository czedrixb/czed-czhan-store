export interface Product {
  id: number
  name: string
  variant: string
  costPrice: number | null
  sellingPrice: number | null
  stock: number
  lowStockThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: number
  productId: number
  productName: string
  productVariant: string
  quantity: number
  costPrice: number
  sellingPrice: number
  revenue: number
  profit: number
  voidedAt: string | null
  soldAt: string
}

export interface DashboardSummary {
  date: string
  revenue: number
  cost: number
  profit: number
  itemsSold: number
  transactions: number
  lowStock: Product[]
}

export interface SalesTotals {
  revenue: number
  cost: number
  profit: number
  itemsSold: number
  transactions: number
}

export interface TopProduct {
  productId: number
  name: string
  variant: string
  quantitySold: number
}

export interface WeeklyReport extends SalesTotals {
  start: string
  end: string
  topProducts: TopProduct[]
}

export interface MonthlyReport extends SalesTotals {
  start: string
  end: string
  topProducts: TopProduct[]
  lowestStock: Product[]
}

export type CountStatus = 'IN_PROGRESS' | 'COMPLETED'

export interface InventoryCount {
  id: number
  countDate: string
  status: CountStatus
  createdAt: string
  completedAt: string | null
}

export interface InventoryCountItem {
  id: number
  productId: number
  productName: string
  productVariant: string
  expectedQuantity: number
  actualQuantity: number | null
  difference: number | null
}

export interface InventoryCountDetail extends InventoryCount {
  items: InventoryCountItem[]
}

export interface ImportPreviewRow {
  rowNumber: number
  name: string
  variant: string
  quantity: number
  costPrice: number | null
  sellingPrice: number | null
  warning?: string
  action: 'create' | 'update'
  existingProductId: number | null
  existingStock: number | null
}

export interface ImportPreview {
  hasHeader: boolean
  hasPrices: boolean
  totalRows: number
  toCreate: number
  toUpdate: number
  rows: ImportPreviewRow[]
}
