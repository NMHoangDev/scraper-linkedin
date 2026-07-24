# TODO: Hoàn thiện UI Seeding Accounts ✅

## Step 1: Install @radix-ui/react-alert-dialog + create AlertDialog component ✅
- [x] Install package
- [x] Create `components/ui/alert-dialog.tsx`

## Step 2: Update StatCard.tsx - Icon góc phải ✅
- [x] Replace iconText prop with LucideIcon
- [x] Add proper icon colors per card type

## Step 3: Update se清理ding-accounts.service.ts - Thêm API methods ✅
- [x] Add createAccount, deleteAccount, triggerRelogin (calls real API, fallback to optimistic toast)

## Step 4: Create AddAccountDialog.tsx ✅
- [x] Dialog form with platform select, name, email/phone, password, notes
- [x] Submit calls service, refresh list, toast
- [x] Supports edit mode (pre-fill data)

## Step 5: Create BulkImportDialog.tsx ✅
- [x] File upload UI with drag-drop area
- [x] Instructions + placeholder download sample button
- [x] Toast "Tính năng đang phát triển"

## Step 6: Update SeedingAccountTable.tsx - DropdownMenu + AlertDialog ✅
- [x] Replace raw "⋯" button with shadcn DropdownMenu + MoreHorizontal icon
- [x] Menu items: Xem chi tiết, Chỉnh sửa, Đăng nhập lại (offline/warning only), Separator, Xóa
- [x] Detail modal via AlertDialog showing full account info
- [x] Delete confirmation via AlertDialog (shadcn)
- [x] Edit dialog via AddAccountDialog (reused with pre-fill)

## Step 7: Update SeedingAccountsManager.tsx - Wire dialogs ✅
- [x] Import + render AddAccountDialog, BulkImportDialog
- [x] onClick handlers for both buttons
- [x] StatCard updated with proper lucide-react icons + colors

## Step 8: TypeScript check ✅
- [x] `npx tsc --noEmit --pretty` — no new errors

## Summary
All 3 requirements completed:
1. ✅ Icon góc phải StatCard: dùng Users, CheckCircle2, PauseCircle, History, AlertTriangle
2. ✅ "Nhập hàng loạt" / "+ Thêm tài khoản" → mở form modal (Dialog shadcn)
3. ✅ Nút "..." → DropdownMenu với các mục đầy đủ + AlertDialog xác nhận xóa

