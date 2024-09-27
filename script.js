javascript:(function () { 
    'use strict';

    const cookieName = "UniversalBack";
    let WorldSpeed, UnitSpeed;

    const baseUnitSpeed = {
        "نبيل": 35,
        "محطمة الحائط": 30,
        "سيف": 22,
        "فأس": 18,
        "ثقيل": 11,
        "فارس خفيف": 10,
        "كشافة": 9
    };

    function getTimeLeftInSecond(row) {
        const TimeString = $(row).find('td').eq(6).text().trim();
        const split = TimeString.split(':');
        if (split.length < 3) {
            UI.InfoMessage('مدة الهجوم غير صحيحة.', 700, 'error');
            return 0;
        }
        const seconds = parseInt(split[2]);
        const minutes = parseInt(split[1]);
        const hours = parseInt(split[0]);
        return seconds + 60 * minutes + 3600 * hours;
    }

    function getSender(row) {
        return $(row).find('td').eq(3).text().trim();
    }

    function getDistance(row) {
        const coordAtt = getAttacker(row).split("|");
        const coordDef = getDefender(row).split("|");
        return Math.sqrt(Math.pow(parseInt(coordAtt[0]) - parseInt(coordDef[0]), 2) + Math.pow(parseInt(coordAtt[1]) - parseInt(coordDef[1]), 2));
    }

    function getDefender(row) {
        const a = $(row).find('td').eq(1).text();
        const tab = a.split(')');
        return tab[tab.length - 2].split('(')[1].trim();
    }

    function getAttacker(row) {
        const a = $(row).find('td').eq(2).text();
        const tab = a.split(')');
        return tab[tab.length - 2].split('(')[1].trim();
    }

    function getTravelTimeInSecond(distance, unit) {
        const speed = baseUnitSpeed[unit];
        if (!speed) {
            return 0;
        }
        return Math.round(distance * (60 * speed / WorldSpeed / UnitSpeed));
    }

    function getBackTime(row) {
        const impact = conversionImpacttoDate(row);
        const travel = getTravelTimeInSecond(getDistance(row), findAttackSpeed(row));
        return new Date(impact.getTime() + travel * 1000);
    }

    function formatTimeWithHours(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    function findAttackSpeed(row) {
        const TimeLeft = getTimeLeftInSecond(row);
        const distance = getDistance(row);

        let bestUnit = "نبيل";
        let bestTimeDifference = Infinity;

        for (const unit in baseUnitSpeed) {
            const travelTime = getTravelTimeInSecond(distance, unit);
            const timeDifference = Math.abs(travelTime - TimeLeft);
            if (timeDifference < bestTimeDifference) {
                bestTimeDifference = timeDifference;
                bestUnit = unit;
            }
        }
        return bestUnit;
    }

    function getImpactTime(row) {
        return $(row).find('td').eq(5).text().trim();
    }

    function conversionImpacttoDate(row) {
        const impact = getImpactTime(row);
        const tab = impact.split(" ");
        const dateActuelle = new Date();
        const last = tab[tab.length - 1];
        let index = tab.length - 1;
        if (!/\d/.test(last)) {
            index = index - 1;
        }

        let resultDate;
        switch (tab[0]) {
            case "غدا":
                resultDate = new Date(dateActuelle.getFullYear(), dateActuelle.getMonth(), dateActuelle.getDate() + 1, tab[index].split(":")[0], tab[index].split(":")[1], tab[index].split(":")[2]);
                break;
            case "في":
                resultDate = new Date(tab[1].split(".")[2], parseInt(tab[1].split(".")[1]) - 1, tab[1].split(".")[0], tab[3].split(":")[0], tab[3].split(":")[1], tab[3].split(":")[2]);
                break;
            default:
                resultDate = new Date(dateActuelle.getFullYear(), dateActuelle.getMonth(), dateActuelle.getDate(), tab[index].split(":")[0], tab[index].split(":")[1], tab[index].split(":")[2]);
        }
        return resultDate;
    }

    function getFinalString(row) {
        const backTime = getBackTime(row);
        return `${findAttackSpeed(row)} | ${getSender(row)} | وقت العودة: ${formatTimeWithHours(backTime)}`;
    }

    function renameAttackName(row, name, attackid, hiddenValue) {
        if (attackid && name && hiddenValue) {
            fetch(`/game.php?village=${getVillageId()}&screen=info_command&ajaxaction=edit_other_comment&id=${attackid}&h=${hiddenValue}`, {
                method: "POST",
                body: new URLSearchParams({ text: name })
            }).then(() => {
                UI.InfoMessage('تمت إعادة تسمية الهجمات بنجاح!', 3000, 'success');
            }).catch(() => {
                UI.InfoMessage('فشل في إعادة تسمية الهجمات.', 3000, 'error');
            });
        }
    }

    function RenameAttack(rows, hiddenValue) {
        rows.each(function (index) {
            const $row = $(this);
            const currentName = $row.find('span.quickedit-label').text().trim();

            if (currentName === "هجوم") {
                const quickeditSpan = $row.find('span.quickedit');
                const attackId = quickeditSpan.attr('data-id');
                const newName = getFinalString($row);
                if (attackId && currentName !== newName) {
                    setTimeout(() => {
                        renameAttackName($row, newName, attackId, hiddenValue);
                    }, index * 50);
                }
            }
        });
    }

    function getCookie(name) {
        const re = new RegExp(name + "=([^;]+)");
        const value = re.exec(document.cookie);
        return (value != null) ? unescape(value[1]) : null;
    }

    function setCookie(name, value, hours) {
        const d = new Date();
        d.setTime(d.getTime() + (hours * 60 * 60 * 1000)); // 3 ساعات
        const expires = "expires=" + d.toUTCString();
        document.cookie = name + "=" + value + "; " + expires;
    }

    function getSpeed() {
        $.ajax({
            type: 'GET',
            url: '/interface.php?func=get_config',
            dataType: 'xml',
            success: function (xml) {
                UnitSpeed = $(xml).find('unit_speed').text();
                WorldSpeed = $(xml).find('speed').text();

                if (UnitSpeed && WorldSpeed) {
                    setCookie(cookieName, WorldSpeed + ";" + UnitSpeed, 3); // تخزين لمدة 3 ساعات فقط
                }
            },
            error: function (error) {
                UI.InfoMessage('خطأ في جلب السرعات.', 3000, 'error');
            }
        });
    }

    function getVillageId() {
        const url = new URL(window.location.href);
        return url.searchParams.get("village");
    }

    $(document).ready(function () {
        const cookie = getCookie(cookieName);
        if (cookie) {
            const cookieValues = cookie.split(';');
            WorldSpeed = cookieValues[0];
            UnitSpeed = cookieValues[1];

            if (!UnitSpeed || !WorldSpeed) {
                getSpeed();
            }
        } else {
            getSpeed();
        }

        $.get('/game.php?screen=overview_villages&mode=incomings&subtype=attacks', function (data) {
            const rows = $(data).find('#incomings_table tr:gt(0)').filter(function () {
                return $(this).find('td').length > 1;
            });

            const hiddenValueElement = $('input[name="h"]');
            if (hiddenValueElement.length === 0) {
                return;
            }

            const hiddenValue = hiddenValueElement.val();
            if (rows.length > 0) {
                RenameAttack(rows, hiddenValue);
            }
        });
    });
})();