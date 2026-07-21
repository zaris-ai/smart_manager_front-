# DiceBear user avatars

The frontend uses the shared `UserAvatar` component for user and expert profile images.

## Behavior

- Every avatar selects one random style from:
  - `lorelei`
  - `bottts`
  - `avataaars`
  - `pixel-art`
  - `notionists`
  - `adventurer`
  - `fun-emoji`
  - `icons`
  - `initials`
  - `micah`
  - `open-peeps`
  - `personas`
  - `ringo`
  - `shape`
  - `thumbs`
- A cryptographically random seed is added to the DiceBear URL, so users using the same style still receive different images.
- The selected style and image remain unchanged during ordinary React re-renders.
- Remounting an avatar or reloading the page generates a new random style and image.
- A local user icon is displayed while loading and if the remote SVG cannot be loaded.
- Full names remain visible. Initials are not used by frontend code as a replacement for the user name.

Example generated URL:

```text
https://api.dicebear.com/10.x/pixel-art/svg?seed=<random-seed>
```

`userId` remains in the component interface so existing calls do not need to change. It is used only to detect when a component starts displaying a different user; it is not sent to DiceBear.

## Configuration

The public DiceBear API is used by default:

```env
NEXT_PUBLIC_DICEBEAR_BASE_URL=https://api.dicebear.com/10.x
```

For production systems that require stronger availability, privacy, or rate-limit control, set this variable to a self-hosted DiceBear HTTP API instance.

## Shared component

```text
src/components/common/UserAvatar.tsx
```
