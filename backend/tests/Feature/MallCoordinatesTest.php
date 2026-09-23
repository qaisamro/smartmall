<?php

namespace Tests\Feature;

use App\Models\Mall;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MallCoordinatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_creation_persists_coordinates_for_public_nearby_sorting(): void
    {
        Role::create(['name' => 'super-admin']);
        Role::create(['name' => 'mall-owner']);
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/malls', [
            'mall_name_ar' => 'متجر الاختبار',
            'mall_name_en' => 'Coordinate Test Store',
            'owner_name' => 'Store Owner',
            'owner_email' => 'coordinate-owner@example.com',
            'owner_password' => 'password123',
            'location_arabic' => 'دورا',
            'type' => 'mall',
            'latitude' => 31.5075,
            'longitude' => 35.0272,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('latitude', 31.5075)
            ->assertJsonPath('longitude', 35.0272);

        $mall = Mall::where('name_en', 'Coordinate Test Store')->firstOrFail();
        $this->assertEqualsWithDelta(31.5075, (float) $mall->getRawOriginal('latitude'), 0.00000001);
        $this->assertEqualsWithDelta(35.0272, (float) $mall->getRawOriginal('longitude'), 0.00000001);

        $publicMalls = $this->getJson('/api/v1/malls')->assertOk()->json();
        $publicMall = collect($publicMalls)->firstWhere('id', $mall->id);
        $this->assertNotNull($publicMall);
        $this->assertEqualsWithDelta(31.5075, (float) $publicMall['latitude'], 0.00000001);
        $this->assertEqualsWithDelta(35.0272, (float) $publicMall['longitude'], 0.00000001);
    }

    public function test_coordinates_must_be_submitted_as_a_pair(): void
    {
        Role::create(['name' => 'super-admin']);
        Role::create(['name' => 'mall-owner']);
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/malls', [
            'mall_name_ar' => 'متجر ناقص',
            'mall_name_en' => 'Incomplete Coordinate Store',
            'owner_name' => 'Store Owner',
            'owner_email' => 'incomplete-owner@example.com',
            'owner_password' => 'password123',
            'location_arabic' => 'دورا',
            'latitude' => 31.5075,
        ])->assertUnprocessable()->assertJsonValidationErrors('longitude');
    }
}