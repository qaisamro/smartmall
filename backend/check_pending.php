<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$p = App\Models\PendingOrder::find(166);
if (!$p) { echo "NOT FOUND 166\n"; } else {
    echo json_encode(['id'=>$p->id,'user_id'=>$p->user_id,'mall_id'=>$p->mall_id,'email'=>App\Models\User::find($p->user_id)->email ?? 'null']) . "\n";
}
$p2 = App\Models\PendingOrder::latest()->first();
if ($p2) {
    echo "LATEST " . json_encode(['id'=>$p2->id,'user_id'=>$p2->user_id,'email'=>App\Models\User::find($p2->user_id)->email ?? 'null']) . "\n";
}
