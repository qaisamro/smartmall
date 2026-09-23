<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Mall extends Model
{
    use HasFactory;

    private const STORE_TYPE_METADATA_PREFIX = '__SMARTMALL_STORE_TYPE__:';

    protected static function boot()
    {
        parent::boot();

        // Cascade delete all related data when a mall is deleted
        static::deleting(function ($mall) {
            // Delete all products belonging to this mall
            $mall->products()->delete();
            // Delete all categories belonging to this mall
            $mall->categories()->delete();
            // Delete theme if exists
            $mall->theme()->delete();
            // Delete subscription if exists
            $mall->subscription()->delete();
        });
    }

    protected $fillable = [
        'owner_id', 'name_ar', 'name_en', 'logo', 'description_ar', 
        'description_en', 'contact_email', 'contact_phone', 'is_active', 'status',
        'slug', 'qr_code_path', 'cover_image', 'description', 'location_arabic', 'type',
        'latitude', 'longitude', 'sort_order', 'delivery_enabled', 'offer_limit', 'total_offers_used',
        'enable_quantity_system', 'suspended_at', 'suspended_reason',
        'google_drive_backup_file_id', 'google_drive_backup_filename', 'google_drive_backup_at',
        'open_time', 'close_time'
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'enable_quantity_system' => 'boolean',
            'delivery_enabled' => 'boolean',
            'suspended_at' => 'datetime',
            'google_drive_backup_at' => 'datetime',
        ];
    }

    public static function encodeStoreTypeMetadata(?string $description, string $type): ?string
    {
        if (!in_array($type, ['grocery', 'butcher'], true)) {
            return $description;
        }

        return self::STORE_TYPE_METADATA_PREFIX . json_encode([
            'description_en' => $description,
            'type' => $type,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function decodeStoreTypeMetadata(?string $value): array
    {
        if (!is_string($value) || !str_starts_with($value, self::STORE_TYPE_METADATA_PREFIX)) {
            return ['description_en' => $value, 'type' => null];
        }

        $decoded = json_decode(substr($value, strlen(self::STORE_TYPE_METADATA_PREFIX)), true);
        if (!is_array($decoded)) {
            return ['description_en' => $value, 'type' => null];
        }

        return [
            'description_en' => $decoded['description_en'] ?? null,
            'type' => in_array($decoded['type'] ?? null, ['grocery', 'butcher'], true) ? $decoded['type'] : null,
        ];
    }

    public function getTypeAttribute($value): string
    {
        $rawDescription = array_key_exists('description_en', $this->attributes)
            ? $this->attributes['description_en']
            : $this->getRawOriginal('description_en');
        return self::decodeStoreTypeMetadata($rawDescription)['type'] ?: ($value ?: 'mall');
    }

    public function setTypeAttribute($value): void
    {
        $type = (string) $value;
        if (in_array($type, ['grocery', 'butcher'], true)) {
            $rawDescription = array_key_exists('description_en', $this->attributes)
                ? $this->attributes['description_en']
                : $this->getRawOriginal('description_en');
            $description = self::decodeStoreTypeMetadata($rawDescription)['description_en'];
            $this->attributes['type'] = 'supermarket';
            $this->attributes['description_en'] = self::encodeStoreTypeMetadata($description, $type);
            return;
        }

        $description = self::decodeStoreTypeMetadata($this->getRawOriginal('description_en'))['description_en'];
        if (array_key_exists('description_en', $this->attributes)) {
            $description = self::decodeStoreTypeMetadata($this->attributes['description_en'])['description_en'];
        }
        $this->attributes['type'] = $type ?: 'mall';
        if ($description !== null || str_starts_with((string) ($this->getRawOriginal('description_en') ?? ''), self::STORE_TYPE_METADATA_PREFIX)) {
            $this->attributes['description_en'] = $description;
        }
    }

    public function getDescriptionEnAttribute($value): ?string
    {
        return self::decodeStoreTypeMetadata($value)['description_en'];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(MallBranch::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    public function theme(): HasOne
    {
        return $this->hasOne(MallTheme::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function mallSections(): HasMany
    {
        return $this->hasMany(MallSection::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }
}
