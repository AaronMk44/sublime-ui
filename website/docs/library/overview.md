---
sidebar_position: 1
title: Overview
---

# Library

`@sublime-ui/library` is a tokens-first design system. A serializable set of
**tokens** generates a matching Material theme for each platform (MUI on web, Paper
on mobile), and every component resolves to the right platform implementation at
build time.

You wrap your app in `<SublimeProvider tokens={tokens}>` and use shared components
like `Card`, `Button`, `AppBar`, and `GlassAppBar`. Notifications are unified
through `useNotify`, so the same call shows a snackbar on mobile and a toast on web.

> Full library docs are being backfilled. This page is a stub.
