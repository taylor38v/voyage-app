import { z } from 'zod';
import { 
  insertTripSchema, 
  insertDaySchema, 
  insertActivitySchema, 
  insertChecklistItemSchema, 
  insertExpenseSchema,
  insertDayTipSchema,
  insertDayBudgetSchema,
  insertChecklistCheckSchema,
  trips, days, activities, checklistItems, expenses, dayTips, dayBudgets, checklistChecks
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  trips: {
    list: {
      method: 'GET' as const,
      path: '/api/trips' as const,
      responses: {
        200: z.array(z.custom<typeof trips.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/trips/:id' as const,
      responses: {
        200: z.custom<any>(), // Returns TripWithDetails
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    getByToken: {
      method: 'GET' as const,
      path: '/api/trips/share/:token' as const,
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trips' as const,
      input: insertTripSchema,
      responses: {
        201: z.custom<typeof trips.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/trips/:id' as const,
      input: insertTripSchema.partial(),
      responses: {
        200: z.custom<typeof trips.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/trips/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  days: {
    create: {
      method: 'POST' as const,
      path: '/api/trips/:tripId/days' as const,
      input: insertDaySchema.omit({ tripId: true }),
      responses: {
        201: z.custom<typeof days.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/days/:id' as const,
      input: insertDaySchema.partial(),
      responses: {
        200: z.custom<typeof days.$inferSelect>(),
      },
    },
  },
  activities: {
    create: {
      method: 'POST' as const,
      path: '/api/days/:dayId/activities' as const,
      input: insertActivitySchema.omit({ dayId: true }),
      responses: {
        201: z.custom<typeof activities.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/activities/:id' as const,
      input: insertActivitySchema.partial(),
      responses: {
        200: z.custom<typeof activities.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/activities/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
  checklist: {
    list: {
      method: 'GET' as const,
      path: '/api/trips/:tripId/checklist' as const,
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trips/:tripId/checklist' as const,
      input: insertChecklistItemSchema.omit({ tripId: true }),
      responses: {
        201: z.custom<typeof checklistItems.$inferSelect>(),
      },
    },
    check: {
      method: 'POST' as const,
      path: '/api/checklist/:itemId/check' as const,
      input: z.object({ checked: z.boolean() }),
      responses: {
        200: z.custom<typeof checklistChecks.$inferSelect>(),
      },
    },
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/trips/:tripId/expenses' as const,
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trips/:tripId/expenses' as const,
      input: insertExpenseSchema.omit({ tripId: true }),
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
  ai: {
    generate: {
      method: 'POST' as const,
      path: '/api/ai/generate' as const,
      input: z.object({
        tripId: z.number(),
        prompt: z.string(),
      }),
      responses: {
        200: z.object({
          message: z.string(),
          daysGenerated: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
