import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision, varchar, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export * from "./models/auth";
export * from "./models/chat";
import { users } from "./models/auth";

// === TABLE DEFINITIONS ===

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // The creator (admin/agent)
  assignedToEmail: text("assigned_to_email"), // The client email
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  destination: text("destination"),
  origin: text("origin"),
  coverEmoji: text("cover_emoji").default("🌴"),
  coverImageUrl: text("cover_image_url"),
  departureDate: timestamp("departure_date"),
  returnDate: timestamp("return_date"),
  totalBudget: integer("total_budget").default(0),
  budgetHotel: integer("budget_hotel").default(0),
  budgetFood: integer("budget_food").default(0),
  budgetTransport: integer("budget_transport").default(0),
  budgetActivities: integer("budget_activities").default(0),
  budgetOther: integer("budget_other").default(0),
  currency: text("currency").default("€"),
  travelers: integer("travelers").default(2),
  status: text("status").default("draft"), // draft, active, archived
  shareToken: text("share_token").unique(), // For sharing
  guideUrl: text("guide_url"), // PDF guide object path
  googleMyMapsUrl: text("google_my_maps_url"), // Google My Maps embed URL
  welcomeText: text("welcome_text"), // Custom welcome text for client view
  participants: jsonb("participants").$type<string[]>().default([]), // Named participants for Tricount
  travelInfo: jsonb("travel_info").$type<TravelInfo>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TravelInfo = {
  emergencyLocal?: string;
  emergencyPolice?: string;
  emergencyAmbulance?: string;
  emergencyFire?: string;
  embassy?: string;
  embassyPhone?: string;
  timezone?: string;
  timezoneOffset?: string;
  localCurrency?: string;
  localCurrencySymbol?: string;
  exchangeRate?: number;
  tippingCulture?: string;
  voltage?: string;
  plugType?: string;
  simWifi?: string;
  customNotes?: string;
};

export const days = pgTable("days", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  dayNumber: integer("day_number").notNull(), // 1, 2, 3...
  dateLabel: text("date_label").notNull(), // "15 Mars"
  city: text("city").notNull(),
  color: text("color").default("#FF6348"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").references(() => days.id, { onDelete: "cascade" }).notNull(),
  time: text("time").notNull(),
  title: text("title").notNull(),
  icon: text("icon").default("activity"), // Lucide icon name
  duration: text("duration"),
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),
  type: text("type").default("activity"), // activity, food, hotel, transport, shopping, nightlife
  note: text("note"),
  isPersonal: boolean("is_personal").default(false), // bon plan 🔥
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  bookingUrl: text("booking_url"),
  googleMapsUrl: text("google_maps_url"),
  address: text("address"),
  checkoutTime: text("checkout_time"),
  confirmationNumber: text("confirmation_number"),
  imageUrl: text("image_url"),
  phone: text("phone"),
  rating: text("rating"),
  reviewCount: text("review_count"),
  priceRange: text("price_range"),
  nights: integer("nights"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dayTips = pgTable("day_tips", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").references(() => days.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const dayBudgets = pgTable("day_budgets", {
  id: serial("id").primaryKey(),
  dayId: integer("day_id").references(() => days.id, { onDelete: "cascade" }).notNull(),
  hotel: numeric("hotel", { precision: 10, scale: 2 }).default("0"),
  food: numeric("food", { precision: 10, scale: 2 }).default("0"),
  transport: numeric("transport", { precision: 10, scale: 2 }).default("0"),
  activities: numeric("activities", { precision: 10, scale: 2 }).default("0"),
  other: numeric("other", { precision: 10, scale: 2 }).default("0"),
});

export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  category: text("category").default("Documents"),
  text: text("text").notNull(),
  isCritical: boolean("is_critical").default(false),
  phase: text("phase").default("pack"),
  subcategory: text("subcategory"),
  hint: text("hint"),
  link: text("link"),
  sortOrder: integer("sort_order").default(0),
});

export const checklistChecks = pgTable("checklist_checks", {
  id: serial("id").primaryKey(),
  checklistItemId: integer("checklist_item_id").references(() => checklistItems.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  checked: boolean("checked").default(false),
  checkedAt: timestamp("checked_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  dayNumber: integer("day_number"),
  category: text("category").notNull(), // hotel, food, transport, activities, other
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  paidBy: text("paid_by"),
  splitWith: jsonb("split_with").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tripDocuments = pgTable("trip_documents", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // flight, hotel, transport, insurance, identity, activity, other
  url: text("url").notNull(),
  note: text("note"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  days: many(days),
  checklistItems: many(checklistItems),
  expenses: many(expenses),
  documents: many(tripDocuments),
}));

export const daysRelations = relations(days, ({ one, many }) => ({
  trip: one(trips, {
    fields: [days.tripId],
    references: [trips.id],
  }),
  activities: many(activities),
  tips: many(dayTips),
  budget: one(dayBudgets, {
    fields: [days.id],
    references: [dayBudgets.dayId],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  day: one(days, {
    fields: [activities.dayId],
    references: [days.id],
  }),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one, many }) => ({
  trip: one(trips, {
    fields: [checklistItems.tripId],
    references: [trips.id],
  }),
  checks: many(checklistChecks),
}));

export const checklistChecksRelations = relations(checklistChecks, ({ one }) => ({
  item: one(checklistItems, {
    fields: [checklistChecks.checklistItemId],
    references: [checklistItems.id],
  }),
  user: one(users, {
    fields: [checklistChecks.userId],
    references: [users.id],
  }),
}));

export const dayTipsRelations = relations(dayTips, ({ one }) => ({
  day: one(days, {
    fields: [dayTips.dayId],
    references: [days.id],
  }),
}));

export const dayBudgetsRelations = relations(dayBudgets, ({ one }) => ({
  day: one(days, {
    fields: [dayBudgets.dayId],
    references: [days.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const tripDocumentsRelations = relations(tripDocuments, ({ one }) => ({
  trip: one(trips, {
    fields: [tripDocuments.tripId],
    references: [trips.id],
  }),
}));

// === ZOD SCHEMAS ===

export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export const insertDaySchema = createInsertSchema(days).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertDayTipSchema = createInsertSchema(dayTips).omit({ id: true });
export const insertDayBudgetSchema = createInsertSchema(dayBudgets).omit({ id: true });
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true });
export const insertChecklistCheckSchema = createInsertSchema(checklistChecks).omit({ id: true, checkedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, userId: true });
export const insertTripDocumentSchema = createInsertSchema(tripDocuments).omit({ id: true, createdAt: true });

// === TYPES ===

export type Trip = typeof trips.$inferSelect;
export type Day = typeof days.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type DayTip = typeof dayTips.$inferSelect;
export type DayBudget = typeof dayBudgets.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type ChecklistCheck = typeof checklistChecks.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type TripDocument = typeof tripDocuments.$inferSelect;

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertDay = z.infer<typeof insertDaySchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertDayTip = z.infer<typeof insertDayTipSchema>;
export type InsertDayBudget = z.infer<typeof insertDayBudgetSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type InsertChecklistCheck = z.infer<typeof insertChecklistCheckSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertTripDocument = z.infer<typeof insertTripDocumentSchema>;

// Complex types for responses
export type DayWithActivities = Day & { activities: Activity[], tips: DayTip[], budget: DayBudget | null };
export type TripWithDetails = Trip & { 
  days: DayWithActivities[], 
  checklistItems: (ChecklistItem & { checks: ChecklistCheck[] })[], 
  expenses: Expense[],
  documents: TripDocument[]
};
