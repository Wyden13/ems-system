import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/context";
import { api, send } from "../api/client";
import {
  businessDate,
  midnight,
  type AttendanceState,
  type TimeEntry,
} from "../api/attendance";
import { useFeedback } from "../components/feedback/context";

export default function useAttendanceClock() {
  const { account } = useAuth();
  const cache = useQueryClient();
  const feedback = useFeedback();
  const requestId = useRef<string | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const state = useQuery({
    queryKey: ["attendance", "state"],
    enabled: account?.role !== "ADMIN",
    queryFn: ({ signal }) =>
      api<AttendanceState>("/api/time-entries/state", { signal }),
    refetchInterval: 30000,
  });
  const refresh = () =>
    Promise.all(
      ["attendance", "payroll", "work-dashboard"].map((key) =>
        cache.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const action = useMutation({
    mutationFn: async () => {
      if (state.data?.active)
        return send<TimeEntry>("/api/time-entries/clock-out", "POST", {
          entryId: state.data.active.id,
        });
      requestId.current ??= crypto.randomUUID();
      return send<TimeEntry>("/api/time-entries/clock-in", "POST", {
        requestId: requestId.current,
      });
    },
    onSuccess: async (entry) => {
      requestId.current = null;
      feedback(
        entry.clockOut
          ? "Clocked out. Your recorded time awaits approval."
          : "Clocked in. Your session is recording.",
      );
      await refresh();
    },
    onError: () => {
      void refresh();
    },
  });
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const serverNow = state.data
    ? Date.parse(state.data.serverTime) +
      Math.max(0, tick - state.dataUpdatedAt)
    : tick;
  const day = businessDate(new Date(serverNow));
  const stateDay = state.data
    ? businessDate(new Date(state.data.serverTime))
    : day;
  useEffect(() => {
    if (stateDay !== day)
      void cache.invalidateQueries({ queryKey: ["attendance", "state"] });
  }, [stateDay, day, cache]);
  const elapsed = state.data?.active
    ? Math.max(0, (serverNow - Date.parse(state.data.active.clockIn)) / 1000)
    : 0;
  const todaySeconds = state.data
    ? stateDay === day
      ? state.data.todaySeconds +
        (state.data.active
          ? Math.max(0, (serverNow - Date.parse(state.data.serverTime)) / 1000)
          : 0)
      : Math.min(
          elapsed,
          Math.max(0, (serverNow - Date.parse(midnight(day))) / 1000),
        )
    : 0;
  return { state, action, serverNow, elapsed, todaySeconds };
}
