<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$m = App\Models\Mall::find(3);
echo json_encode(['id'=>$m->id,'name'=>$m->name_ar,'enable_quantity_system'=>$m->enable_quantity_system,'is_active'=>$m->is_active]) . "\n";
$p = App\Models\Product::where('mall_id',3)->first();
if ($p) {
    echo json_encode(['product_id'=>$p->id,'name'=>$p->name_ar,'stock_quantity'=>$p->stock_quantity,'mall_enable'=>$p->mall->enable_quantity_system ?? 'null']) . "\n";
}
