<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Mall;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class TestCatalogSeeder extends Seeder
{
    /**
     * Additive, idempotent catalog data for manually verifying grocery/butcher
     * presentation in the mobile app. This seeder does not create users,
     * change the schema, or touch existing products and orders.
     */
    public function run(): void
    {
        $owner = User::whereHas('roles', fn ($query) => $query->whereIn('name', ['mall-owner', 'super-admin', 'admin']))->first();

        if (!$owner) {
            throw new RuntimeException('TestCatalogSeeder requires an existing mall owner or admin user.');
        }

        $this->seedMall(
            ownerId: $owner->id,
            slug: 'test-fresh-grocery',
            type: 'grocery',
            nameAr: 'متجر الخضروات التجريبي',
            nameEn: 'Test Fresh Grocery',
            descriptionAr: 'بيانات اختبارية لعرض متجر الخضروات في تطبيق SmartMall.',
            descriptionEn: 'Test catalog for the SmartMall grocery experience.',
            categories: [
                [
                    'slug' => 'test-fresh-grocery-vegetables',
                    'name_ar' => 'خضروات طازجة',
                    'name_en' => 'Fresh Vegetables',
                    'products' => [
                        [
                            'barcode' => 'TEST-GROCERY-TOMATO',
                            'name_ar' => 'طماطم طازجة',
                            'name_en' => 'Fresh Tomatoes',
                            'price' => 5.50,
                            'unit' => 'kg',
                            'unit_type' => 'kg',
                            'pricing_type' => 'per_weight',
                            'weight' => 1,
                            'options' => ['notes' => 'منتج اختبار — يباع حسب الوزن'],
                        ],
                        [
                            'barcode' => 'TEST-GROCERY-CUCUMBER',
                            'name_ar' => 'خيار بلدي',
                            'name_en' => 'Local Cucumbers',
                            'price' => 4.25,
                            'unit' => 'kg',
                            'unit_type' => 'kg',
                            'pricing_type' => 'per_weight',
                            'weight' => 1,
                            'options' => ['notes' => 'بيانات اختبارية'],
                        ],
                    ],
                ],
                [
                    'slug' => 'test-fresh-grocery-fruit',
                    'name_ar' => 'فواكه',
                    'name_en' => 'Fruits',
                    'products' => [
                        [
                            'barcode' => 'TEST-GROCERY-APPLE',
                            'name_ar' => 'تفاح أحمر',
                            'name_en' => 'Red Apples',
                            'price' => 7.90,
                            'unit' => 'kg',
                            'unit_type' => 'kg',
                            'pricing_type' => 'per_weight',
                            'weight' => 1,
                            'options' => ['notes' => 'بيانات اختبارية'],
                        ],
                    ],
                ],
            ],
        );

        $this->seedMall(
            ownerId: $owner->id,
            slug: 'test-family-butcher',
            type: 'butcher',
            nameAr: 'ملحمة العائلة التجريبية',
            nameEn: 'Test Family Butcher',
            descriptionAr: 'بيانات اختبارية لعرض متجر اللحوم في تطبيق SmartMall.',
            descriptionEn: 'Test catalog for the SmartMall butcher experience.',
            categories: [
                [
                    'slug' => 'test-family-butcher-beef',
                    'name_ar' => 'لحوم حمراء',
                    'name_en' => 'Red Meat',
                    'products' => [
                        [
                            'barcode' => 'TEST-BUTCHER-BEEF',
                            'name_ar' => 'لحم بقري طازج',
                            'name_en' => 'Fresh Beef',
                            'price' => 42.00,
                            'unit' => 'kg',
                            'unit_type' => 'kg',
                            'pricing_type' => 'per_weight',
                            'weight' => 1,
                            'options' => [
                                'cut' => 'شرائح',
                                'preparation' => 'منزوع العظم',
                                'notes' => 'بيانات اختبارية',
                            ],
                        ],
                    ],
                ],
                [
                    'slug' => 'test-family-butcher-poultry',
                    'name_ar' => 'دواجن',
                    'name_en' => 'Poultry',
                    'products' => [
                        [
                            'barcode' => 'TEST-BUTCHER-CHICKEN',
                            'name_ar' => 'دجاج كامل',
                            'name_en' => 'Whole Chicken',
                            'price' => 18.50,
                            'unit' => 'piece',
                            'unit_type' => 'piece',
                            'pricing_type' => 'per_unit',
                            'weight' => 1,
                            'options' => [
                                'preparation' => 'منظف وجاهز للطبخ',
                                'notes' => 'بيانات اختبارية',
                            ],
                        ],
                    ],
                ],
            ],
        );
    }

    private function seedMall(
        int $ownerId,
        string $slug,
        string $type,
        string $nameAr,
        string $nameEn,
        string $descriptionAr,
        string $descriptionEn,
        array $categories,
    ): void {
        $mall = Mall::firstOrNew(['slug' => $slug]);
        $mall->fill([
            'owner_id' => $ownerId,
            'name_ar' => $nameAr,
            'name_en' => $nameEn,
            'description_ar' => $descriptionAr,
            'description_en' => $descriptionEn,
            'location_arabic' => 'بيانات اختبارية',
            'status' => 'approved',
            'is_active' => true,
            'delivery_enabled' => true,
            'enable_quantity_system' => true,
        ]);
        $mall->type = $type;
        $mall->save();

        foreach ($categories as $categoryData) {
            $category = Category::updateOrCreate(
                ['mall_id' => $mall->id, 'name_ar' => $categoryData['name_ar']],
                [
                    'name_en' => $categoryData['name_en'],
                    'icon' => null,
                ],
            );

            foreach ($categoryData['products'] as $productData) {
                $metadata = [
                    'unit_type' => $productData['unit_type'],
                    'pricing_type' => $productData['pricing_type'],
                    'weight' => $productData['weight'],
                    'options' => $productData['options'],
                ];

                Product::updateOrCreate(
                    ['barcode' => $productData['barcode']],
                    [
                        'mall_id' => $mall->id,
                        'category_id' => $category->id,
                        'name_ar' => $productData['name_ar'],
                        'name_en' => $productData['name_en'],
                        'description_ar' => 'منتج اختبار لعرض بيانات الوحدة والتسعير.',
                        'description_en' => Product::encodeDescriptionMetadata(
                            'Test product for unit and pricing metadata.',
                            $metadata,
                        ),
                        'price' => $productData['price'],
                        'discount_price' => null,
                        'unit' => $productData['unit'],
                        'stock_quantity' => 100,
                        'min_stock_alert' => 5,
                        'is_active' => true,
                        'hide_stock_from_customer' => false,
                    ],
                );
            }
        }
    }
}