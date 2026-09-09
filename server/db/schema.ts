import { sql } from 'drizzle-orm'
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const userRoles = ['ADMIN', 'MEMBER'] as const
export type UserRole = (typeof userRoles)[number]

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    role: text('role', { enum: userRoles }).notNull().default('MEMBER'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_username_unique').on(sql`lower(${table.username})`)],
)

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transactionTypes = [
  'SALE',
  'RESTOCK',
  'ADJUSTMENT',
  'DAMAGE',
  'EXPIRED',
  'MISSING',
] as const
export type TransactionType = (typeof transactionTypes)[number]

export const countStatuses = ['IN_PROGRESS', 'COMPLETED'] as const
export type CountStatus = (typeof countStatuses)[number]

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    variant: text('variant').notNull().default(''),
    // Integer centavos. Null = not yet priced (e.g. fresh Excel import).
    costPrice: integer('cost_price'),
    sellingPrice: integer('selling_price'),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('products_name_variant_unique').on(
      sql`lower(${table.name})`,
      sql`lower(${table.variant})`,
    ),
  ],
)

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  // Snapshots at the time of sale — never recalculated from the product's current price.
  costPrice: integer('cost_price').notNull(),
  sellingPrice: integer('selling_price').notNull(),
  revenue: integer('revenue').notNull(),
  profit: integer('profit').notNull(),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  soldAt: timestamp('sold_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  type: text('type', { enum: transactionTypes }).notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  reason: text('reason'),
  saleId: integer('sale_id').references(() => sales.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const inventoryCounts = pgTable('inventory_counts', {
  id: serial('id').primaryKey(),
  countDate: timestamp('count_date', { withTimezone: true }).notNull().defaultNow(),
  status: text('status', { enum: countStatuses }).notNull().default('IN_PROGRESS'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const inventoryCountItems = pgTable('inventory_count_items', {
  id: serial('id').primaryKey(),
  inventoryCountId: integer('inventory_count_id')
    .notNull()
    .references(() => inventoryCounts.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  expectedQuantity: integer('expected_quantity').notNull(),
  actualQuantity: integer('actual_quantity'),
  difference: integer('difference'),
})
