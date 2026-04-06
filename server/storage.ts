import { db } from "./db";
import { 
  users, sessions,
  trips, days, activities, checklistItems, expenses, dayTips, dayBudgets, checklistChecks, tripDocuments,
  type InsertTrip, type InsertDay, type InsertActivity, type InsertChecklistItem, type InsertExpense,
  type InsertDayTip, type InsertDayBudget, type InsertChecklistCheck, type InsertTripDocument,
  type Trip, type Day, type Activity, type ChecklistItem, type Expense, type ChecklistCheck, type TripDocument,
  type TripWithDetails, type User, type UpdateProfile
} from "@shared/schema";
import { eq, or, sql, asc } from "drizzle-orm";

export interface IStorage {
  // Trips
  getTripsForUser(userId: string, email?: string | null): Promise<Trip[]>;
  getTrip(id: number): Promise<TripWithDetails | undefined>;
  getTripByToken(token: string): Promise<TripWithDetails | undefined>;
  createTrip(trip: InsertTrip & { userId: string }): Promise<Trip>;
  updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip>;
  deleteTrip(id: number): Promise<void>;

  // Days
  createDay(day: InsertDay): Promise<Day>;
  updateDay(id: number, updates: Partial<InsertDay>): Promise<Day>;
  
  // Activities
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, updates: Partial<InsertActivity>): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Checklist
  getChecklist(tripId: number): Promise<any[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  checkItem(itemId: number, userId: string, checked: boolean): Promise<ChecklistCheck>;

  // Expenses
  getExpenses(tripId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Tips
  createDayTips(tips: InsertDayTip[]): Promise<void>;
  createDayTip(tip: InsertDayTip): Promise<any>;
  updateDayTip(id: number, updates: Partial<InsertDayTip>): Promise<any>;
  deleteDayTip(id: number): Promise<void>;

  // Checklist
  updateChecklistItem(id: number, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem>;
  deleteChecklistItem(id: number): Promise<void>;

  // Days
  deleteDay(id: number): Promise<void>;

  // Budget
  upsertDayBudget(budget: InsertDayBudget): Promise<void>;
  updateDayBudget(dayId: number, updates: Partial<InsertDayBudget>): Promise<any>;

  // Documents
  getDocuments(tripId: number): Promise<TripDocument[]>;
  createDocument(doc: InsertTripDocument): Promise<TripDocument>;
  updateDocument(id: number, updates: Partial<InsertTripDocument>): Promise<TripDocument>;
  deleteDocument(id: number): Promise<void>;

  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserProfile(id: string, profile: UpdateProfile): Promise<User>;
  updateUserPassword(id: string, newPasswordHash: string): Promise<void>;
  invalidateOtherSessions(userId: string, currentSid: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getTripsForUser(userId: string, email?: string | null): Promise<Trip[]> {
    const conditions = [eq(trips.userId, userId)];
    if (email) {
      conditions.push(sql`lower(${trips.assignedToEmail}) LIKE '%' || lower(${email}) || '%'`);
    }
    return await db.select().from(trips).where(or(...conditions));
  }

  async getTrip(id: number): Promise<TripWithDetails | undefined> {
    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, id),
      with: {
        days: {
          with: {
            activities: { orderBy: (activities, { asc }) => [asc(activities.sortOrder), asc(activities.time)] },
            tips: { orderBy: (tips, { asc }) => [asc(tips.sortOrder)] },
            budget: true
          },
          orderBy: (days, { asc }) => [asc(days.dayNumber)]
        },
        checklistItems: {
          with: { checks: true }
        },
        expenses: true,
        documents: {
          orderBy: (docs, { asc }) => [asc(docs.sortOrder), asc(docs.createdAt)]
        }
      }
    });
    return trip as TripWithDetails | undefined;
  }

  async getTripByToken(token: string): Promise<TripWithDetails | undefined> {
    const trip = await db.query.trips.findFirst({
      where: eq(trips.shareToken, token),
      with: {
        days: {
          with: {
            activities: { orderBy: (activities, { asc }) => [asc(activities.sortOrder), asc(activities.time)] },
            tips: { orderBy: (tips, { asc }) => [asc(tips.sortOrder)] },
            budget: true
          },
          orderBy: (days, { asc }) => [asc(days.dayNumber)]
        },
        checklistItems: {
          with: { checks: true }
        },
        expenses: true,
        documents: {
          orderBy: (docs, { asc }) => [asc(docs.sortOrder), asc(docs.createdAt)]
        }
      }
    });
    return trip as TripWithDetails | undefined;
  }

  async createTrip(trip: InsertTrip & { userId: string }): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    return newTrip;
  }

  async updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip> {
    const [updated] = await db.update(trips).set(updates).where(eq(trips.id, id)).returning();
    return updated;
  }

  async deleteTrip(id: number): Promise<void> {
    await db.delete(trips).where(eq(trips.id, id));
  }

  async createDay(day: InsertDay): Promise<Day> {
    const [newDay] = await db.insert(days).values(day).returning();
    return newDay;
  }

  async updateDay(id: number, updates: Partial<InsertDay>): Promise<Day> {
    const [updated] = await db.update(days).set(updates).where(eq(days.id, id)).returning();
    return updated;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async updateActivity(id: number, updates: Partial<InsertActivity>): Promise<Activity> {
    const [updated] = await db.update(activities).set(updates).where(eq(activities.id, id)).returning();
    return updated;
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getChecklist(tripId: number): Promise<any[]> {
    return await db.query.checklistItems.findMany({
      where: eq(checklistItems.tripId, tripId),
      with: { checks: true }
    });
  }

  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const [newItem] = await db.insert(checklistItems).values(item).returning();
    return newItem;
  }

  async checkItem(checklistItemId: number, userId: string, checked: boolean): Promise<ChecklistCheck> {
    const existing = await db.select().from(checklistChecks)
      .where(eq(checklistChecks.checklistItemId, checklistItemId));
    const userCheck = existing.find(c => c.userId === userId);
    if (userCheck) {
      const [res] = await db.update(checklistChecks)
        .set({ checked, checkedAt: new Date() })
        .where(eq(checklistChecks.id, userCheck.id))
        .returning();
      return res;
    }
    const [res] = await db.insert(checklistChecks)
      .values({ checklistItemId, userId, checked })
      .returning();
    return res;
  }

  async getExpenses(tripId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.tripId, tripId));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [result] = await db.select().from(expenses).where(eq(expenses.id, id));
    return result;
  }

  async createExpense(expense: InsertExpense & { userId: string }): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async createDayTips(tips: InsertDayTip[]): Promise<void> {
    if (tips.length > 0) await db.insert(dayTips).values(tips);
  }

  async createDayTip(tip: InsertDayTip): Promise<any> {
    const [newTip] = await db.insert(dayTips).values(tip).returning();
    return newTip;
  }

  async updateDayTip(id: number, updates: Partial<InsertDayTip>): Promise<any> {
    const [updated] = await db.update(dayTips).set(updates).where(eq(dayTips.id, id)).returning();
    return updated;
  }

  async deleteDayTip(id: number): Promise<void> {
    await db.delete(dayTips).where(eq(dayTips.id, id));
  }

  async updateChecklistItem(id: number, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem> {
    const [updated] = await db.update(checklistItems).set(updates).where(eq(checklistItems.id, id)).returning();
    return updated;
  }

  async deleteChecklistItem(id: number): Promise<void> {
    await db.delete(checklistItems).where(eq(checklistItems.id, id));
  }

  async deleteDay(id: number): Promise<void> {
    await db.delete(days).where(eq(days.id, id));
  }

  async upsertDayBudget(budget: InsertDayBudget): Promise<void> {
    await db.insert(dayBudgets).values(budget).onConflictDoUpdate({
      target: dayBudgets.id,
      set: budget
    });
  }

  async updateDayBudget(dayId: number, updates: Partial<InsertDayBudget>): Promise<any> {
    const existing = await db.select().from(dayBudgets).where(eq(dayBudgets.dayId, dayId));
    if (existing.length > 0) {
      const [updated] = await db.update(dayBudgets).set(updates).where(eq(dayBudgets.dayId, dayId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(dayBudgets).values({ dayId, hotel: "0", food: "0", transport: "0", activities: "0", other: "0", ...updates }).returning();
      return created;
    }
  }

  async getDocuments(tripId: number): Promise<TripDocument[]> {
    return await db.select().from(tripDocuments)
      .where(eq(tripDocuments.tripId, tripId))
      .orderBy(asc(tripDocuments.sortOrder), asc(tripDocuments.createdAt));
  }

  async createDocument(doc: InsertTripDocument): Promise<TripDocument> {
    const [newDoc] = await db.insert(tripDocuments).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: number, updates: Partial<InsertTripDocument>): Promise<TripDocument> {
    const [updated] = await db.update(tripDocuments).set(updates).where(eq(tripDocuments.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(tripDocuments).where(eq(tripDocuments.id, id));
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserProfile(id: string, profile: UpdateProfile): Promise<User> {
    const [updated] = await db.update(users)
      .set({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserPassword(id: string, newPasswordHash: string): Promise<void> {
    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async invalidateOtherSessions(userId: string, currentSid: string): Promise<void> {
    await db.execute(sql`DELETE FROM sessions WHERE sess::text LIKE ${'%"userId":"' + userId + '"%'} AND sid != ${currentSid}`);
  }
}

export const storage = new DatabaseStorage();
