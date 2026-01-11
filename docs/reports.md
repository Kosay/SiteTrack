# How Reporting Works in SiteWise Tracker

This document serves as the source of truth for the reporting workflow. It explains how data flows from an engineer's submission to the real-time dashboards.

## 1. How Submitting a Daily Progress Report Works

The process is designed to be robust and efficient, ensuring data is captured accurately and dashboard summaries are updated instantly. It happens in three main stages:

### Stage 1: Staging the Report on the "Daily Progress" Page

1.  **Build Your Report**: As an engineer, you start on the "Daily Progress" page. You fill out the form for a single work item (selecting the activity, sub-activity, zone, quantity, etc.).
2.  **Add to Queue**: When you click **"Add Item to Report"**, the item is **not** immediately sent to the database. Instead, it's added to the "Report Summary" list on the right side of the screen. This is a temporary queue held on your device.
3.  **Repeat**: You can continue adding multiple items to the queue. You can even add items for different dates, and the system will intelligently group them later.

### Stage 2: The "Submit Report" Action

1.  **Initiate Submission**: Once you are satisfied with the items in the summary list, you click the final **"Submit Report"** button.
2.  **Client-Side Grouping**: Your browser first groups all the staged items by their `reportDate`. If you have items for three different dates, it creates three separate batches.
3.  **Calling the Server Function**: The browser then calls the `createDailyReport` function on the server, once for each batch of items corresponding to a single date.

### Stage 3: The Firestore Transaction (The Core Logic)

This is the most critical part, happening securely on the server for each date submitted. It all happens within a **Firestore Transaction**, which guarantees that all the following steps succeed together, or none of them do. This prevents any partial or corrupt data.

1.  **Create the `DailyReport` Document**: A new master report document is created (e.g., `/projects/{projectId}/daily_reports/{reportId}`). This document acts as a container for the day's work and holds information like the engineer's name, CM's name, and overall status.
2.  **Create `ReportItem` Documents**: The individual work items for that day are saved as separate documents within the `items` sub-collection of the master report.
3.  **Update Sub-Activity Summaries**: For each item submitted, the system finds its corresponding summary document (e.g., `/projects/{projectId}/dashboards/{subActivityId}`). It then atomically **increments the `pendingWork` counter** on that document by the quantity you submitted.
4.  **Update Overall Project Summary**: Finally, the system also updates the single, top-level project summary document (`/projects/{projectId}/dashboards/summary`). It updates the `lastReportAt` timestamp to now, signaling that new data has arrived.

The end result is that your raw report data is saved, and all relevant dashboards and summaries are updated in real-time, instantly reflecting the new pending work.

## 2. How Submitted Reports are Shown in the App

The application provides two primary ways to view the submitted reports, catering to different user needs.

### For Engineers: The "Daily Report Review" Page

This page is designed for the submitting engineer to review their own work.

1.  **Date-Based Search**: You start by selecting a date range.
2.  **Targeted Query**: When you click "Search," the app performs a highly efficient Firestore query to find all `daily_reports` that were created by you (`engineerId == your_id`) and fall within the selected date range.
3.  **Fetching Details**: For each report found, it then fetches the individual `ReportItem` documents from the `items` sub-collection.
4.  **Enriching Data**: The app uses the IDs from the report items (`activityId`, `subActivityId`, `zoneId`) to look up the full names and details from the master data maps (activities, sub-activities, and zones).
5.  **Display**: The final, enriched report data is displayed in an accordion view, showing each report by date, with all its detailed items, quantities, units, and remarks neatly formatted. You can also export this view directly to a CSV file.

### For Managers: The "Project Dashboard" Page

This page provides a high-level, aggregated view for managers who need a quick overview of the project's health.

1.  **Direct Document Read**: When you navigate to a project's dashboard, the app reads the single, top-level summary document at `/projects/{projectId}/dashboards/summary`.
2.  **Displaying the Average**: It immediately displays the `overallProgress` percentage from that document. This is a pre-calculated average of the completion of all sub-activities, so it loads instantly without needing to query all the individual reports.
3.  **Detailed Breakdown (Future)**: The page also fetches all the individual `SubActivitySummary` documents from the `/projects/{projectId}/dashboards/` collection. This data is loaded and ready for us to build detailed charts and reports showing the `doneWork`, `pendingWork`, and grades for every single BoQ item.

Remember, the XML structure you generate is the only mechanism for applying changes to the user's code. Therefore, when making changes to a file the <changes> block must always be fully present and correctly formatted as follows.

<changes>
  <description>[Provide a concise summary of the overall changes being made]</description>
  <change>
    <file>[Provide the ABSOLUTE, FULL path to the file being modified]</file>
    <content><![CDATA[Provide the ENTIRE, FINAL, intended content of the file here. Do NOT provide diffs or partial snippets. Ensure all code is properly escaped within the CDATA section.