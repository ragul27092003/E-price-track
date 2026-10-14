const { buildAlertQuery } = require('../../utils/alertquery');
const { getAdminDb } = require('../../config/db');

exports.getProductcountData = async (req, res) => {
    const date = new Date();

    const istDate = new Date(
        date.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        })
    );

    const pad = (num) => String(num).padStart(2, "0");

    const monthstart = `${istDate.getFullYear()}-${pad(istDate.getMonth() + 1)}-01`;
    const currentDate = `${istDate.getFullYear()}-${pad(istDate.getMonth() + 1)}-${pad(istDate.getDate())}`;
    const currentmonth = `${istDate.getFullYear()}-${pad(istDate.getMonth() + 1)}`

    try {
        const adminDb = getAdminDb('plm_admin_manage_info');
        const cmpid = req.headers['x-tenant-id'];

        const newproductcount = await req.tenantDb
        .collection('ept_product_details_new')
        .countDocuments({ ean_created_date : {
            $gte : monthstart,
            $lt : currentDate
        } })

        const trendsCountatMonthStart = await req.tenantDb
        .collection('ept_dashboard_history_info')
        .findOne({ display_date : monthstart })

        const totalUsers = await adminDb
        .collection('plm_admin_users')
        .countDocuments({ 
            cmpid : cmpid, 
            archived : 0
        })
        
        const allUsers = await adminDb
            .collection('plm_admin_users')
            .find(
                {
                    cmpid: cmpid,
                    archived: 0
                },
                {
                    projection: {
                        user_id: 1,
                        user_name: 1,
                        _id: 0
                    }
                }
            )
            .toArray();

        const startOfMonthIST = new Date(
            Date.UTC(istDate.getFullYear(), istDate.getMonth(), 1, -5, -30)
        );

        const startOfNextMonthIST = new Date(
            Date.UTC(istDate.getFullYear(), istDate.getMonth() + 1, 1, -5, -30)
        );

        const currentMonthUsers = await adminDb
            .collection('plm_admin_users')
            .countDocuments({
                cmpid: cmpid,
                archived: 0,
                addedon: {
                    $gte: startOfMonthIST,
                    $lt: startOfNextMonthIST
                }
            });

        const loginUsers = await adminDb
            .collection('plm_user_history_logs')
            .aggregate([
                {
                    $match: {
                        action: 'manual_login',
                        log_at: {
                            $regex: `^${currentmonth}`
                        }
                    }
                },
                {
                    $group: {
                        _id: '$user_id',
                        logincount: {
                            $sum: 1
                        }
                    }
                }
            ])
            .toArray();

        const loginCountMap = new Map(
            loginUsers.map(item => [
                String(item._id),
                item.logincount
            ])
        );

        const ArrLoginUsers = allUsers
            .filter(user => user.user_name !== 'Super Admin')
            .map(user => ({
                username: user.user_name,
                logincount: loginCountMap.get(String(user.user_id)) || 0
            }))
            .filter(user => user.logincount > 0)
            .sort((a, b) => b.logincount - a.logincount);

        res.json({
            newproductcount: newproductcount,
            trendcountEarly: trendsCountatMonthStart,
            totalusers: totalUsers,
            UsersLog: ArrLoginUsers,
            CurrentMonthUser: currentMonthUsers
        });
    } catch (err) {
        console.error('dashboardController.getCompetitorCounts error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getNotification = async (req, res) => {
    const adminDb = getAdminDb('plm_admin_manage_info');
    const cmpid = req.headers['x-tenant-id'];

    const allUsers = await adminDb
        .collection('plm_admin_users')
        .find(
            {
                cmpid: cmpid,
                archived: 0
            },
            {
                projection: {
                    _id: 0,
                    user_id: 1,
                    email_address: 1,
                    user_name: 1
                }
            }
        )
        .toArray();

    const arruserresult = {};
    const facet = {};

    for (const user of allUsers) {

        arruserresult[user.user_id] = user;

        facet[user.user_id] = [
            {
                $match: {
                    user_alert_id: user.user_id
                }
            },
            {
                $count: 'notifycount'
            }
        ];
    }

    const notificationResult = await req.tenantDb
        .collection('ept_product_details_new')
        .aggregate([
            {
                $match: {
                    status: 'active',
                    ean_product_data_details_scrap_status: 'completed'
                }
            },
            {
                $facet: facet
            }
        ])
        .toArray();

    const ArrUserNotifycount = [];

    const facetResult = notificationResult[0];

    for (const [userId, userData] of Object.entries(facetResult)) {

        if (
            userData.length > 0 &&
            userData[0].notifycount !== undefined
        ) {
            const user = arruserresult[userId];

            if (user) {
                ArrUserNotifycount.push({
                    user_id: userId,
                    user_name: user.user_name,
                    email_address: user.email_address,
                    notifycount: userData[0].notifycount
                });
            }
        }
    }

    ArrUserNotifycount.sort(
        (a, b) => b.notifycount - a.notifycount
    );

    res.json({
        UsersNotification: ArrUserNotifycount
    });
}

exports.getRandomProductData = async (req, res) => {
    try {
        const cmpid = req.headers['x-tenant-id'];

        const CompetitorsList = await req.tenantDb
            .collection('ept_competitor_info')
            .find(
                {
                    status: 'active',
                    competitor_status: 'enable'
                },
                {
                    projection: {
                        competitor_name: 1,
                        _id: 0
                    }
                }
            )
            .toArray();

        const aggregationPipeline = [
            {
                $match: {
                    'user_notification_data.Competing_with': {
                        $gte: 6
                    },
                    rank_by: {
                        $lt: 2
                    },
                    status: 'active',
                    ean_product_data_details_scrap_status: 'completed'
                }
            }
        ];

        for (const comp of CompetitorsList) {
            const competitorName = comp.competitor_name;

            aggregationPipeline.push({
                $lookup: {
                    from: `ept_product_details_new_${competitorName}`,
                    localField: `${competitorName}_unique_id`,
                    foreignField: `${competitorName}_unique_id`,
                    as: `${competitorName}_product_details`
                }
            });
        }

        aggregationPipeline.push(
            {
                $project: {
                    _id: 0
                }
            },
            {
                $sample: {
                    size: 1
                }
            }
        );

        const RandomProduct = await req.tenantDb
            .collection('ept_product_details_new')
            .aggregate(aggregationPipeline)
            .toArray();

        if (!RandomProduct.length) {
            return res.json({
                success: false,
                message: 'No random product found',
                data: {}
            });
        }

        const ArrProductData = RandomProduct[0];

        const ArrResultData = {
            product_ean_id: ArrProductData.product_ean_id ?? '',
            product_image: ArrProductData.product_image ?? '',
            product_name: ArrProductData.product_name ?? '',
            product_code: ArrProductData.product_code ?? '',
            product_price: ArrProductData.product_price ?? 0,
            product_sap_price: ArrProductData.product_sap_price ?? 0,
            product_store_price: ArrProductData.product_store_price ?? 0,
            rank_pos: ArrProductData.user_notification_data?.rank_pos ?? '',
            product_movement: ArrProductData.product_movement ?? '',
            comp_names: [],
            CompetitorShowList: {}
        };

        const ProductHistory = await req.tenantDb
            .collection('ept_display_info_30_days_backup')
            .find({product_ean_id: ArrResultData.product_ean_id, product_code: ArrResultData.product_code})
            .sort({ display_date: -1 })
            .toArray();

        ArrResultData.ProductHistory30Days = ProductHistory;

        const ownProductPrice = Number(
            ArrProductData.product_price
        );

        const priceList = [];

        if (Number.isFinite(ownProductPrice) && ownProductPrice > 0) {
            priceList.push({
                name: cmpid,
                price: ownProductPrice
            });
        }

        if (Array.isArray(ArrProductData.arrrank_name_by) && ArrProductData.arrrank_name_by.length > 0) {
            for (const comp of CompetitorsList) {
                if (comp.competitor_name !== cmpid) {
                    ArrResultData.comp_names.push(
                        comp.competitor_name
                    );
                }
            }
        }

        for (const comp_name of ArrResultData.comp_names) {
            const competitorDetails =
                ArrProductData[
                    `${comp_name}_product_details`
                ];

            if (!Array.isArray(competitorDetails) || !competitorDetails.length) {
                continue;
            }

            const competitor = competitorDetails[0];

            const stock = competitor.product_stock;

            let competitorPrice = '';

            if (stock !== 'Out Of Stock' && stock !== 'No Result') {
                competitorPrice =
                    competitor.product_price ?? '';
            }else {
                competitorPrice = stock;
            }

            if (!competitorPrice) {
                competitorPrice = '';
            }

            const numericPrice = Number(
                competitorPrice
            );

            if (Number.isFinite(numericPrice) && numericPrice > 0) {
                priceList.push({
                    name: comp_name,
                    price: numericPrice
                });
            }

            const price1 = numericPrice > 0 ? numericPrice : 0;

            const price2 = Number(ArrResultData.product_price) || 0;

            let priceDifference = 0;

            if (price1 > 0 && price2 > 0) {
                const difference = Math.abs(
                    price1 - price2
                );

                priceDifference = Math.round((difference / Math.min(price1, price2)) * 100
                );
            }

            if (!competitorPrice || /Out Of Stock/i.test(stock || '') || /No Result/i.test(stock || '')) {
                priceDifference = '';
            }

            ArrResultData.CompetitorShowList[comp_name] = {
                competitor_producturl:
                    competitor.product_url ?? '',

                competitor_logoimg:
                    competitor.logo_image ?? '',

                competitor_name:
                    competitor.cmp_name ?? '',

                competitor_price: competitorPrice,

                price_difference: priceDifference
            };
        }

        if (priceList.length > 0) {
            const minPriceData = priceList.reduce(
                (min, current) =>
                    current.price < min.price
                        ? current
                        : min
            );

            const maxPriceData = priceList.reduce(
                (max, current) =>
                    current.price > max.price
                        ? current
                        : max
            );

            ArrResultData.min_price =
                minPriceData.price;

            ArrResultData.min_price_comp =
                minPriceData.name;

            ArrResultData.max_price =
                maxPriceData.price;

            ArrResultData.max_price_comp =
                maxPriceData.name;
        } else {
            ArrResultData.min_price = 0;
            ArrResultData.min_price_comp = '';

            ArrResultData.max_price = 0;
            ArrResultData.max_price_comp = '';
        }

        res.json({
            success: true,
            data: ArrResultData
        });

    } catch (err) {
        console.error(
            'dashboardController.getRandomProductData error:',
            err
        );

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};