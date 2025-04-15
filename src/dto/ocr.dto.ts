import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class OcrRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'filePath cannot be empty' })
    filePath!: string; // Changed from documentUrl, removed URL validation

    @IsOptional()
    @IsBoolean()
    includeImageBase64?: boolean; // Optional properties don't need the assertion
}

// Types based on Mistral AI OCR Response structure

export type OCRPageDimensions = {
  width: number;
  height: number;
};

export type OCRUsageInfo = {
  /**
   * Number of pages processed
   */
  pagesProcessed: number;
  /**
   * Document size in bytes
   */
  docSizeBytes?: number | null | undefined;
};

export type OCRImageObject = {
  /**
   * Image ID for extracted image in a page
   */
  id: string;
  /**
   * X coordinate of top-left corner of the extracted image
   */
  topLeftX: number | null;
  /**
   * Y coordinate of top-left corner of the extracted image
   */
  topLeftY: number | null;
  /**
   * X coordinate of bottom-right corner of the extracted image
   */
  bottomRightX: number | null;
  /**
   * Y coordinate of bottom-right corner of the extracted image
   */
  bottomRightY: number | null;
  /**
   * Base64 string of the extracted image
   */
  imageBase64?: string | null | undefined;
};

export type OCRPageObject = {
  /**
   * The page index in a pdf document starting from 0
   */
  index: number;
  /**
   * The markdown string response of the page
   */
  markdown: string;
  /**
   * List of all extracted images in the page
   */
  images: Array<OCRImageObject>;
  /**
   * The dimensions of the PDF Page's screenshot image
   */
  dimensions: OCRPageDimensions | null;
};

export type OCRResponse = {
  /**
   * List of OCR info for pages.
   */
  pages: Array<OCRPageObject>;
  /**
   * The model used to generate the OCR.
   */
  model: string;
  usageInfo: OCRUsageInfo;
  /**
   * Optional: The original filename, added during processing.
   */
  fileName?: string;
};
