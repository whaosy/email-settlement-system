import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { emailRouter } from "./routers/email";
import { emailPreviewRouter } from "./routers/emailPreview";
import { emailHistoryRouter } from "./routers/emailHistory";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Local login for standalone deployment (no OAuth server required)
    localLogin: publicProcedure
      .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        // Simple local auth: any username/password combo creates a local user
        const openId = `local_${input.username}`;
        await db.upsertUser({
          openId,
          name: input.username,
          email: `${input.username}@local`,
          loginMethod: 'local',
          lastSignedIn: new Date(),
        });
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.username,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, username: input.username };
      }),
  }),
  email: emailRouter,
  emailPreview: emailPreviewRouter,
  emailHistory: emailHistoryRouter,
});

export type AppRouter = typeof appRouter;
