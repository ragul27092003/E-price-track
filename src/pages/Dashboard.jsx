import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Calendar, Package, CheckSquare, CheckCircle2, Clock, Bell,
  TrendingUp, Users, BarChart3, IndianRupee, BarChart
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── mock data based on Eprice-Track ──────────────────────────────────────────

const statisticsData = [
  { name: "Segment A", value: 17.1, color: "#3b82f6" },
  { name: "Segment B", value: 15.3, color: "#475569" },
  { name: "Segment C", value: 14.6, color: "#ef4444" },
  { name: "Segment D", value: 14.5, color: "#ca8a04" },
  { name: "Segment E", value: 10.1, color: "#10b981" },
  { name: "Segment F", value: 5.8,  color: "#2563eb" },
  { name: "Segment G", value: 5.2,  color: "#c026d3" },
  { name: "Segment H", value: 17.4, color: "#84cc16" }, // Remaining to total 100%
];

const brandAnalytics = {
  analyzed: 1,
  rank1Count: 1,
  higherByDiff: 0,
  sathyaAvg: 16989,
  competitorAvg: 17342
};

// ─── animation presets ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── helpers ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, subtext, icon: Icon, color, bg }) {
  return (
    <motion.div variants={itemVariants} className="bg-card rounded-xl p-5 card-shadow border border-border h-full hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
      {subtext && <p className="text-[10px] text-muted-foreground mt-2 opacity-80">{subtext}</p>}
    </motion.div>
  );
}

function StatRow({ label, value, colorClass, isCurrency = false }) {
  return (
    <div className="space-y-1.5 py-2">
      <div className="flex justify-between items-end">
        <span className="text-xl font-bold text-foreground">
          {isCurrency && <span className="text-sm mr-1">₹</span>}
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: '100%' }} />
      </div>
    </div>
  );
}

// ─── Custom Label for Donut Chart ──────────────────────────────────────────────

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  const RADIAN = Math.PI / 180;
  // Calculate the center point of the donut slice
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Hide the label if the slice is too small to fit the text nicely
  if (value < 4) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${value}%`}
    </text>
  );
};

// ─── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [selectedBrand, setSelectedBrand] = useState("AO Smith");
  const [selectedCategory, setSelectedCategory] = useState("All Category");

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      // Added the container styling here to match the Feed Setup page
      className="bg-card border border-border p-6 space-y-6"
    >

      {/* ── header ── */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Eprice-Track analytics and competitor performance overview
          </p>
        </div>
      </motion.div>

      {/* ── KPI Grid (8 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label="SAP : 2026-04-27" 
          value="08:02:37 AM" 
          subtext="Sathya Price Last Updated On This APP"
          icon={Calendar} color="text-info" bg="bg-info/10" 
        />
        <KpiCard 
          label="Total Products" 
          value="4206" 
          subtext="Analytics for total active & inactive products"
          icon={Package} color="text-foreground" bg="bg-secondary" 
        />
        <KpiCard 
          label="Active Products" 
          value="2764" 
          subtext="Analytics for total products"
          icon={CheckSquare} color="text-primary" bg="bg-primary/10" 
        />
        <KpiCard 
          label="Completed Products" 
          value="2420" 
          subtext="Analytics for completed products"
          icon={CheckCircle2} color="text-foreground" bg="bg-foreground/10" 
        />
        <KpiCard 
          label="Pending Products" 
          value="344" 
          subtext="Analytics for pending products"
          icon={Clock} color="text-destructive" bg="bg-destructive/10" 
        />
        <KpiCard 
          label="Price Notification" 
          value="39" 
          subtext="Analytics for price notifications"
          icon={Bell} color="text-muted-foreground" bg="bg-secondary" 
        />
        <KpiCard 
          label="Price Update Ratio" 
          value="87%" 
          subtext="Analytics for daily price update ratio"
          icon={TrendingUp} color="text-purple-500" bg="bg-purple-500/10" 
        />
        <KpiCard 
          label="Competitors" 
          value="15/15" 
          subtext="Analytics for user selected competitors"
          icon={Users} color="text-indigo-500" bg="bg-indigo-500/10" 
        />
      </div>

      {/* ── Charts & Analytics Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* Brand Analytics */}
        <motion.div variants={itemVariants} className="bg-card rounded-xl p-6 card-shadow border border-border flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg text-foreground">Brand Analytics</h3>
            </div>
            
            {/* Mock Dropdowns for UI */}
            <div className="flex items-center gap-3">
              <select 
                className="bg-secondary text-sm rounded-md px-3 py-1.5 border-none outline-none"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option>AO Smith</option>
                <option>Samsung</option>
                <option>LG</option>
              </select>
              <select 
                className="bg-secondary text-sm rounded-md px-3 py-1.5 border-none outline-none"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option>All Category</option>
                <option>Electronics</option>
                <option>Appliances</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 flex-1 justify-center flex flex-col">
            <StatRow label="Total Product Analyzed" value={brandAnalytics.analyzed} colorClass="bg-blue-200" />
            <StatRow label="Rank1 Product Count For Total Product" value={brandAnalytics.rank1Count} colorClass="bg-purple-200" />
            <StatRow label="Higher by Average Price Difference" value={brandAnalytics.higherByDiff} colorClass="bg-orange-200" isCurrency />
            <StatRow label="Sathya's Average Price Across the Product" value={brandAnalytics.sathyaAvg} colorClass="bg-green-500" isCurrency />
            <StatRow label="Competitor's Average Price Across the Product" value={brandAnalytics.competitorAvg} colorClass="bg-blue-500" isCurrency />
          </div>
        </motion.div>

        {/* Overall Statistics Donut Chart */}
        <motion.div variants={itemVariants} className="bg-card rounded-xl p-6 card-shadow border border-border flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Overall Statistics</h3>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statisticsData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={120} 
                  dataKey="value"
                  stroke="none"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {statisticsData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => [`${val}%`, "Share"]} 
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}