<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$cols = Illuminate\Support\Facades\Schema::getColumns('orders');
foreach ($cols as $c) {
    echo $c['name'] . " | " . $c['type'] . "\n";
}
echo "---\n";
$order = App\Models\Order::first();
if ($order) {
    echo json_encode(array_keys($order->toArray())) . "\n";
}
