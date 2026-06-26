import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    Req,
    BadRequestException,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger"
import { PhotosService } from "./photos.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { BypassSecurity } from "../common/decorators/bypass-security.decorator"
import {
    CreatePhotoDto,
    UpdatePhotoDto,
    SearchPhotosDto,
    CreatePhotoCollectionDto,
    CreateCommentDto,
    CreatePhotoRequestDto,
    CreatePhotoSubmissionDto,
    PurchasePhotoDto,
    CreatePhotoOfferDto,
    UpdatePhotoOfferDto,
} from "./dto/photo.dto"


@ApiTags("Photos")
@Controller("photos")
@ApiBearerAuth("JWT-auth")
export class PhotosController {
    constructor(private readonly photosService: PhotosService) {}

    // ─── Photo CRUD ──────────────────────────────

    @Post("upload")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiConsumes("multipart/form-data")
    @ApiOperation({ summary: "Upload a photo to CDN and index in Supabase" })
    async uploadPhoto(
        @Req() req: any,
        @GetUser("id") userId: string,
    ) {
        // Parse multipart/form-data via @fastify/multipart
        const data = await req.file()
        if (!data) {
            throw new BadRequestException("No file provided")
        }

        const buffer = await data.toBuffer()
        const file = {
            buffer,
            originalname: data.filename,
            mimetype: data.mimetype,
            size: buffer.length,
        }

        const fields = data.fields as Record<string, any>
        
        const parseBool = (val: any) => {
            if (val === undefined || val === null) return undefined
            return val === 'true' || val === true || val === '1' || val === 1
        }

        const parseNum = (val: any) => {
            if (val === undefined || val === null || val === '') return undefined
            const num = Number(val)
            return isNaN(num) ? undefined : num
        }

        // Handle tags sent as array (e.g. tags[] or tags)
        let tags: string[] = []
        const tagsField = fields?.['tags[]'] || fields?.tags
        if (tagsField) {
            if (Array.isArray(tagsField)) {
                tags = tagsField.map(t => t.value).filter(Boolean)
            } else if (tagsField.value) {
                tags = [tagsField.value]
            }
        }

        const title = fields?.title?.value
        if (!title) {
            throw new BadRequestException("Title is required")
        }

        const dto: CreatePhotoDto = {
            title,
            description: fields?.description?.value,
            category: fields?.category?.value,
            theme: fields?.theme?.value,
            tags,
            isForSale: parseBool(fields?.isForSale?.value),
            price: parseNum(fields?.price?.value),
            currency: fields?.currency?.value,
            licenseType: fields?.licenseType?.value,
            isPublic: parseBool(fields?.isPublic?.value),
            locationName: fields?.locationName?.value,
        }

        return this.photosService.uploadPhoto(file as any, dto, userId)
    }

    @Get()
    @ApiOperation({ summary: "Get public photo feed (paginated, filterable)" })
    async getPhotos(@Query() params: SearchPhotosDto) {
        return this.photosService.getPhotos(params)
    }

    @Get("feed")
    @ApiOperation({ summary: "Get personalized photo feed" })
    async getFeed(
        @Query() params: SearchPhotosDto,
    ) {
        return this.photosService.getPhotos(params)
    }

    @Get("marketplace")
    @ApiOperation({ summary: "Get photos for sale" })
    async getMarketplace(@Query() params: SearchPhotosDto) {
        return this.photosService.getMarketplacePhotos(params)
    }

    @Get("mine")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get my uploaded photos" })
    async getMyPhotos(
        @GetUser("id") userId: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.photosService.getMyPhotos(userId, page, limit)
    }

    @Get(":id")
    @ApiOperation({ summary: "Get photo details" })
    async getPhoto(@Param("id") id: string) {
        return this.photosService.getPhotoById(id)
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Update photo metadata" })
    async updatePhoto(
        @Param("id") id: string,
        @Body() dto: UpdatePhotoDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.updatePhoto(id, userId, dto)
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Delete a photo" })
    async deletePhoto(
        @Param("id") id: string,
        @GetUser("id") userId: string,
    ) {
        await this.photosService.deletePhoto(id, userId)
        return { message: "Photo deleted" }
    }

    // ─── Social Features ──────────────────────────

    @Post(":id/like")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Toggle like on a photo" })
    async toggleLike(
        @Param("id") photoId: string,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.toggleLike(photoId, userId)
    }

    @Get(":id/comments")
    @ApiOperation({ summary: "Get comments for a photo" })
    async getComments(@Param("id") photoId: string) {
        return this.photosService.getComments(photoId)
    }

    @Post(":id/comments")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Add comment to a photo" })
    async addComment(
        @Param("id") photoId: string,
        @Body() dto: CreateCommentDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.addComment(photoId, userId, dto)
    }

    @Post(":id/purchase")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Purchase a photo on the marketplace via Solana simulated transaction" })
    async purchasePhoto(
        @Param("id") photoId: string,
        @Body() dto: PurchasePhotoDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.purchasePhoto(photoId, userId, dto)
    }

    // ─── Photo Offers ────────────────────────────

    @Post(":id/offers")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Make an offer on a photo in SOL" })
    async makeOffer(
        @Param("id") photoId: string,
        @Body() dto: CreatePhotoOfferDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.createOffer(photoId, userId, dto)
    }

    @Get(":id/offers")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get offers for a photo" })
    async getOffers(
        @Param("id") photoId: string,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.getOffersForPhoto(photoId, userId)
    }

    @Put("offers/:offerId")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Accept, reject, or cancel an offer" })
    async updateOfferStatus(
        @Param("offerId") offerId: string,
        @Body() dto: UpdatePhotoOfferDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.updateOfferStatus(offerId, userId, dto)
    }



    // ─── Collections/Albums ──────────────────────

    @Post("collections")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Create a photo collection" })
    async createCollection(
        @Body() dto: CreatePhotoCollectionDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.createCollection(userId, dto)
    }

    @Get("collections/public")
    @ApiOperation({ summary: "Get public collections" })
    async getPublicCollections(@Query("userId") userId?: string) {
        return this.photosService.getCollections(userId)
    }

    @Get("collections/mine")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get my collections" })
    async getMyCollections(@GetUser("id") userId: string) {
        return this.photosService.getCollections(userId)
    }

    @Post("collections/:id/photos/:photoId")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Add photo to collection" })
    async addToCollection(
        @Param("id") collectionId: string,
        @Param("photoId") photoId: string,
        @GetUser("id") userId: string,
    ) {
        await this.photosService.addPhotoToCollection(collectionId, photoId, userId)
        return { message: "Photo added to collection" }
    }

    // ─── Photography Request/Commission Endpoints ───

    @Post("requests")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Create a custom photography or editing request" })
    async createRequest(
        @Body() dto: CreatePhotoRequestDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.createRequest(userId, dto)
    }

    @Get("requests")
    @ApiOperation({ summary: "Get all open photography or editing requests" })
    async getRequests() {
        return this.photosService.getRequests()
    }

    @Post("requests/:id/submissions")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Submit a proposal or photo response to a request" })
    async createSubmission(
        @Param("id") requestId: string,
        @Body() dto: CreatePhotoSubmissionDto,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.createSubmission(requestId, userId, dto)
    }

    @Get("requests/:id/submissions")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get submissions/responses for a request" })
    async getSubmissions(
        @Param("id") requestId: string,
        @GetUser("id") userId: string,
    ) {
        return this.photosService.getSubmissionsForRequest(requestId, userId)
    }

    @Get("photographers/:userId/stats")
    @ApiOperation({ summary: "Get photographer profile details and stats" })
    async getPhotographerStats(@Param("userId") userId: string) {
        return this.photosService.getPhotographerStats(userId)
    }
}
