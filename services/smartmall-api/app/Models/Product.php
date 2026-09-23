<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    private const METADATA_PREFIX = '__SMARTMALL_PRODUCT_METADATA__:';

    protected $fillable = [
        'mall_id', 'category_id', 'section_id', 'mall_section_id', 'name_ar', 'name_en', 'description_ar',
        'description_en', 'price', 'discount_price', 'stock_quantity', 'min_stock_alert',
        'sku', 'barcode', 'qr_code', 'unit',
        'brand', 'image', 'link_photo', 'is_active',
        'hide_stock_from_customer', 'shelf_location'
    ];

    protected $casts = [
        'price'            => 'decimal:2',
        'discount_price'   => 'decimal:2',
        'stock_quantity'   => 'integer',
        'min_stock_alert'  => 'integer',
        'is_active'        => 'boolean',
        'hide_stock_from_customer' => 'boolean',
    ];

    protected $appends = [
        'current_price',
        'unit_type',
        'pricing_type',
        'weight',
        'options',
    ];

    public static function encodeDescriptionMetadata(?string $description, ?array $metadata): ?string
    {
        if (empty($metadata)) {
            return $description;
        }

        return self::METADATA_PREFIX . json_encode([
            'description_en' => $description,
            'metadata' => $metadata,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function decodeDescriptionMetadata(?string $value): array
    {
        if (!is_string($value) || !str_starts_with($value, self::METADATA_PREFIX)) {
            return ['description_en' => $value, 'metadata' => []];
        }

        $decoded = json_decode(substr($value, strlen(self::METADATA_PREFIX)), true);
        if (!is_array($decoded)) {
            return ['description_en' => $value, 'metadata' => []];
        }

        return [
            'description_en' => $decoded['description_en'] ?? null,
            'metadata' => is_array($decoded['metadata'] ?? null) ? $decoded['metadata'] : [],
        ];
    }

    public function productMetadata(): array
    {
        $rawDescription = array_key_exists('description_en', $this->attributes)
            ? $this->attributes['description_en']
            : $this->getRawOriginal('description_en');
        return self::decodeDescriptionMetadata($rawDescription)['metadata'];
    }

    public function mall(): BelongsTo
    {
        return $this->belongsTo(Mall::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function mallSection(): BelongsTo
    {
        return $this->belongsTo(MallSection::class, 'mall_section_id');
    }

    public function barcodeOverride(): BelongsTo
    {
        return $this->belongsTo(ProductBarcodeOverride::class, 'barcode', 'barcode');
    }

    public function shelves()
    {
        return $this->belongsToMany(Shelf::class, 'product_locations', 'product_id', 'shelf_id')
                    ->withPivot('level');
    }

    public function currentPrice(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->discount_price ?? $this->price,
        );
    }

    protected function linkPhoto(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ?: $this->barcodeOverride?->link_photo,
        );
    }

    protected function sectionId(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ?: $this->barcodeOverride?->section_id,
        );
    }

    public function getDescriptionEnAttribute($value): ?string
    {
        return self::decodeDescriptionMetadata($value)['description_en'];
    }

    public function getUnitTypeAttribute(): ?string
    {
        return $this->productMetadata()['unit_type'] ?? null;
    }

    public function getPricingTypeAttribute(): ?string
    {
        return $this->productMetadata()['pricing_type'] ?? null;
    }

    public function getWeightAttribute(): mixed
    {
        return $this->productMetadata()['weight'] ?? null;
    }

    public function getOptionsAttribute(): ?array
    {
        $options = $this->productMetadata()['options'] ?? null;
        return is_array($options) && $options !== [] ? $options : null;
    }
}
