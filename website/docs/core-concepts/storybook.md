---
title: Storybook (Navigation)
sidebar_position: 3
---

# Storybook (Navigation)

In Sublime UI you don't hand-write router code. You describe your navigation as a
typed **storybook** — one per platform — and a build step compiles it into the
idiomatic router each platform expects.

## The mental model

A storybook is a plain, typed description of your screens and how they connect: a
navigator is a **book**, a screen is a **page**, and a book can **link** to another
book to nest navigators. You author this in `storybook.web.ts` and
`storybook.native.ts`, kept separate because web and mobile navigation are
genuinely different shapes — different screens, different presentation formats.

The important part: **you author the storybook; the navigation code is generated.**
The `sublime build:nav` step reads each storybook ahead of time and emits idiomatic
routers — react-router on web, React Navigation on mobile — plus a fully typed route
map. Your app just mounts the platform-resolved `<Navigation>` and moves between
pages with one typed `useNav()` hook.

Because the route map is generated from the same source, navigation is checked at
the type level: an unknown page name is a compile error, and screen params are
required exactly when a page declares them. Treat the compiled
`navigation.*.tsx` / `routes.d.ts` files as build artifacts — edit the storybook,
not the output.

## Go deeper

The deep section covers books, pages, links, print formats, the `useNav()` API, and
what `build:nav` emits and validates.

- [Storybook Navigation](/docs/navigation/storybook)
