---
name: Ritmo
colors:
  primary: "oklch(0.54 0.12 198)"
  sun: "oklch(0.80 0.16 80)"
  ink: "oklch(0.23 0.025 215)"
  surface: "oklch(1 0 0)"
  shelf: "oklch(0.972 0.009 200)"
  danger: "oklch(0.52 0.19 25)"
typography:
  family: "Rethink Sans Variable"
  title: { size: "2.125rem", weight: 800, letterSpacing: "-0.03em" }
  body: { size: "1rem", weight: 450 }
  label: { size: "0.8125rem", weight: 600 }
rounded:
  cell: "4px"
  check: "7px"
  control: "10px"
  container: "16px"
  pill: "9999px"
---

# Ritmo design

## Scene
A phone in daylight, glanced at for a few seconds between commitments. Light theme by default on pure white, high contrast, 44 px touch targets.

## Color
Committed to one role: teal carries every action, selection and progress. Sun yellow appears only in icons (the Today star, the streak flame). Each list has its own icon color for wayfinding. Red is reserved for overdue work and destructive actions.

## Type
Rethink Sans, one family, self-hosted. Large titles at weight 800 give each list a clear voice; everything else is 15 to 17 px.

## Layout
Phone first: a bottom tab bar (Today, Upcoming, Focus, Habits, Menu) and a floating add button that opens the quick add next to the thumb. On wider screens a light sidebar with colored list icons and a narrow central column. Lists are open rows, not boxes.

## Motion
150 to 250 ms, ease-out. The checkbox fills and pops when a task is completed, the Today ring advances, the habit button fills. Nothing moves on its own. Reduced motion makes all of it instant.

## Components
Prumo components, themed through its tokens. The task checkbox is a rounded square (7 px) so it reads as a task and not a radio; habit map cells use 4 px so twelve weeks stay a grid at a glance. Ritmo overrides color, type, radius and control height, and adds the tab bar, the floating add button and the list icons.
