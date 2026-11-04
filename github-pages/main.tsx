import React from "react";
import { createRoot } from "react-dom/client";
import HolidayCalendar from "../app/holiday-calendar";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("The calendar could not start.");
createRoot(root).render(
  <HolidayCalendar
    apiBase="https://duke-holiday-schedule.totalmeerkat.chatgpt.site"
    siteBase="/gutbrains-holidays/"
  />,
);
