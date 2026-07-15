from app.modules.all_platform.schemas.common import BaseResponse
from app.modules.all_platform.schemas.seeding import (
    SeedingMarkSaveRequest,
    SeedingMarkVerifyRequest,
    SeedingMarkGetAllRequest,
    SeedingCountRequest,
    SeedingCountResponse,
    SeedingKpiSaveRequest,
    KpiTargetRequest,
)
from app.modules.all_platform.schemas.kpi import (
    KpiWeekItem,
    AssignKpiRequest,
    KpiMemberData,
    GetKpiByEmailRequest,
    GetAllKpiRequest,
    CheckPermissionRequest,
    VerifyLeaderCodeRequest,
    UpdateRoleToMemberRequest,
    SyncProgressRequest,
)
from app.modules.all_platform.schemas.posts import (
    GetAllPostsRequest,
    FilterPostsRequest,
    UnifiedPostsRequest,
    UnifiedFilterRequest,
)
from app.modules.all_platform.schemas.categories import (
    CategoryAddRequest,
    CategoryUpdateRequest,
    CategoryDeleteRequest,
)
from app.modules.all_platform.schemas.quick_comment import (
    QuickCommentAddRequest,
    QuickCommentUpdateRequest,
    QuickCommentReorderRequest,
)
from app.modules.all_platform.schemas.quick_inbox import (
    QuickInboxAddRequest,
    QuickInboxUpdateRequest,
    QuickInboxReorderRequest,
)
from app.modules.all_platform.schemas.quote import (
    QuoteFormCreateRequest,
    QuoteFormUpdateRequest,
    QuoteItemInput,
    QuoteCreateRequest,
    QuoteUpdateRequest,
)
from app.modules.all_platform.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    UpdateProfileRequest,
    PromoteToLeaderRequest,
    SocialAccountCreateRequest,
    SocialAccountUpdateRequest,
    ChangePasswordRequest,
    DeactivateAccountRequest,
    CheckEmailRequest,
    ResetPasswordRequest,
)
