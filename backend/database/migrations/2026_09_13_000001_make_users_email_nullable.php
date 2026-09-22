<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE `users` MODIFY `email` VARCHAR(191) NULL');
    }

    public function down(): void
    {
        if (DB::table('users')->whereNull('email')->exists()) {
            throw new \RuntimeException('Cannot revert: users with NULL email exist.');
        }
        DB::statement('ALTER TABLE `users` MODIFY `email` VARCHAR(191) NOT NULL');
    }
};
