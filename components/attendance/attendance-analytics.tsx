"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAttendanceAnalyticsAction } from "@/actions/attendance";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  ClockIcon,
  PercentIcon,
  TrendingUpIcon,
  CalendarIcon,
  ActivityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function AttendanceAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await getAttendanceAnalyticsAction({});
        setData(res);
      } catch (err: any) {
        toast.error(err.message || "Failed to load attendance analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm font-medium">
        Calculating attendance metrics & report graphs...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Punctuality Rate */}
        <Card className="border border-border/60 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-md rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Punctuality Rate</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <PercentIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{data?.punctualityRate || 0}%</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <TrendingUpIcon className="w-3 h-3" /> On-time arrivals
            </p>
          </div>
        </Card>

        {/* Total Working Days */}
        <Card className="border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card shadow-md rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Recorded Days</span>
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{data?.totalDays || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Total shifts logged</p>
          </div>
        </Card>

        {/* Late Arrivals */}
        <Card className="border border-border/60 bg-gradient-to-br from-rose-500/10 via-card to-card shadow-md rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Late Flags</span>
            <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500">
              <AlertTriangleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{data?.lateCount || 0}</div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">Past grace period</p>
          </div>
        </Card>

        {/* Total Hours Worked */}
        <Card className="border border-border/60 bg-gradient-to-br from-blue-500/10 via-card to-card shadow-md rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Hours</span>
            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{data?.totalHours || 0} hrs</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Cumulative duration</p>
          </div>
        </Card>
      </div>

      {/* Visual Analytics Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Trend Bar Chart */}
        <Card className="border border-border/60 bg-card shadow-lg rounded-3xl p-6">
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ActivityIcon className="w-5 h-5 text-primary" /> Daily Attendance Breakdown
                </CardTitle>
                <CardDescription className="text-xs">Present vs Late logs over time</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px]">Time Series</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-64 w-full">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="late" name="Late" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No time series data logged yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Working Hours Trend Area Chart */}
        <Card className="border border-border/60 bg-card shadow-lg rounded-3xl p-6">
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-primary" /> Shift Hours Track
                </CardTitle>
                <CardDescription className="text-xs">Daily hours accumulated</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px]">Hours Logged</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-64 w-full">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="hours" name="Hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No shift hours logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
