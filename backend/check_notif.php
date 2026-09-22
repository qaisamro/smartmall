<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$notifs = Illuminate\Support\Facades\DB::table('notifications')->orderByDesc('created_at')->limit(5)->get();
foreach ($notifs as $n) {
    echo $n->id . " | " . $n->type . " | " . $n->notifiable_id . " | " . $n->created_at . " | " . substr($n->data,0,80) . "\n";
}
echo "---\n";
$subs = App\Models\PushSubscription::count();
echo "PushSubscriptions: $subs\n";
$fcm = App\Models\FcmToken::count();
echo "FcmTokens: $fcm\n";
$jobs = Illuminate\Support\Facades\DB::table('jobs')->count();
echo "Jobs: $jobs\n";
$failed = Illuminate\Support\Facades\DB::table('failed_jobs')->count();
echo "Failed: $failed\n";
