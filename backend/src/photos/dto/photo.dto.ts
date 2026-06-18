import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsArray,
    IsEnum,
    MaxLength,
    Min,
} from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export enum PhotoCategory {
    LANDSCAPE = "landscape",
    PORTRAIT = "portrait",
    STREET = "street",
    WILDLIFE = "wildlife",
    ARCHITECTURE = "architecture",
    ABSTRACT = "abstract",
    MACRO = "macro",
    AERIAL = "aerial",
    NIGHT = "night",
    FOOD = "food",
    TRAVEL = "travel",
    WEDDING = "wedding",
    BLACK_WHITE = "black-white",
    UNDERWATER = "underwater",
    FASHION = "fashion",
    DOCUMENTARY = "documentary",
    GENERAL = "general",
}

export enum LicenseType {
    PERSONAL = "personal",
    COMMERCIAL = "commercial",
    EDITORIAL = "editorial",
    EXTENDED = "extended",
}

export class CreatePhotoDto {
    @ApiProperty()
    @IsString()
    @MaxLength(255)
    title: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({ enum: PhotoCategory })
    @IsOptional()
    @IsEnum(PhotoCategory)
    category?: PhotoCategory

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    theme?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[]

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isForSale?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    currency?: string

    @ApiPropertyOptional({ enum: LicenseType })
    @IsOptional()
    @IsEnum(LicenseType)
    licenseType?: LicenseType

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    locationName?: string
}

export class UpdatePhotoDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({ enum: PhotoCategory })
    @IsOptional()
    @IsEnum(PhotoCategory)
    category?: PhotoCategory

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    theme?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[]

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isForSale?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number

    @ApiPropertyOptional({ enum: LicenseType })
    @IsOptional()
    @IsEnum(LicenseType)
    licenseType?: LicenseType

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean
}

export class SearchPhotosDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    query?: string

    @ApiPropertyOptional({ enum: PhotoCategory })
    @IsOptional()
    @IsEnum(PhotoCategory)
    category?: PhotoCategory

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    theme?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tag?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sort?: "latest" | "trending" | "most_liked" | "price_asc" | "price_desc"

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    forSaleOnly?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    userId?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number
}

export class CreatePhotoCollectionDto {
    @ApiProperty()
    @IsString()
    @MaxLength(255)
    title: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    theme?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean
}

export class CreateCommentDto {
    @ApiProperty()
    @IsString()
    content: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    parentId?: string
}

export class CreatePhotoRequestDto {
    @ApiProperty()
    @IsString()
    @MaxLength(255)
    title: string

    @ApiProperty()
    @IsString()
    description: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    budget?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    currency?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    deadline?: string
}

export class CreatePhotoSubmissionDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    photoId?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    price?: number
}

export class PurchasePhotoDto {
    @ApiProperty()
    @IsString()
    transactionRef: string

    @ApiPropertyOptional({ enum: LicenseType })
    @IsOptional()
    @IsEnum(LicenseType)
    licenseType?: LicenseType
}

export class CreatePhotoOfferDto {
    @ApiProperty()
    @IsNumber()
    amount: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    currency?: string
}

export class UpdatePhotoOfferDto {
    @ApiProperty()
    @IsString()
    status: string // accepted, rejected, cancelled
}


