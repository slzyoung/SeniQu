import { IsString, IsOptional, IsBoolean, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAlbumDto {
    @ApiProperty({ description: "Title of the album" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: "Description of the album", required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: "Cover URL of the album", required: false })
    @IsString()
    @IsOptional()
    coverUrl?: string;

    @ApiProperty({ description: "Theme of the album", required: false })
    @IsString()
    @IsOptional()
    theme?: string;

    @ApiProperty({ description: "Is the album public?", required: false })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}

export class CreateAlbumItemDto {
    @ApiProperty({ description: "Title of the item" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: "Description of the item", required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: "Type of the item: photo, artwork, digital_art", required: false })
    @IsString()
    @IsOptional()
    itemType?: string;

    @ApiProperty({ description: "Is the item public?", required: false })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}

export class UpdateAlbumItemDto {
    @ApiProperty({ description: "Is the item public?", required: false })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}
