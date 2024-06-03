normalize={'date':'date','Date':'date','day':'date','Day':'date','month':'month','Month':'month','year':'year','Year':'year'}
time_format={'date':'D','Date':'D','day':'D','Day':'D','month':'M','Month':'M','year':'Y','Year':'Y'}

function getMainSubFieldType(jsonObject) {
    // console.log(jsonObject)
    const encoding = jsonObject['encoding'];
    if (encoding['x'].type === 'nominal' || encoding['x'].type === 'temporal') {
        return [encoding['x'].field, encoding['x'].type, encoding['y'].field, encoding['y'].type];
    }
    if (encoding['y'].type === 'nominal' || encoding['y'].type === 'temporal') {
        return [encoding['y'].field, encoding['y'].type, encoding['x'].field, encoding['x'].type];
    }
    return [encoding['x'].field, encoding['x'].type, encoding['y'].field, encoding['y'].type];
    // }
    // // You might want to handle the case where 'encoding' is not in jsonObject.
    // return [null, null, null, null];
}

function removeLonelyNumbers(lst) {
    let result = [];
    lst.sort((a, b) => a - b);
    for (let i = 0; i < lst.length; i++) {
        if (i === 0) {
            if (lst[i + 1] - lst[i] === 1) {
                result.push(lst[i]);
            }
        }
        if (i === lst.length - 1) {
            if (lst[i] - lst[i - 1] === 1) {
                result.push(lst[i]);
            }
        }
        if (i !== 0 && i !== lst.length - 1) {
            if (lst[i] - lst[i - 1] === 1 || lst[i + 1] - lst[i] === 1) {
                result.push(lst[i]);
            }
        }
    }
    return result;
}

function generateConditions(numlist, mainField) {
    let filteredYears = removeLonelyNumbers(numlist);
    console.log(filteredYears);
    let ranges = [];
    let start = null;
    for (let year of filteredYears) {
        if (start === null) {
            start = year;
        } else if (!filteredYears.includes(year + 1)) {
            let end = year;
            if (start !== end) {
                ranges.push([start, end]);
            }
            start = null;
        }
    }
    if (start !== null) {
        let end = filteredYears[filteredYears.length - 1];
        if (start !== end) {
            ranges.push([start, end]);
        }
    }
    let conditions = ranges.map(range => `(${normalize[mainField]}(datum['${mainField}']) >= ${range[0] - 1} && ${normalize[mainField]}(datum['${mainField}']) <= ${range[1] - 1})`);
    return conditions;
}

function convertS2D(jsonData) {
    // Pattern to match outermost single quotes and inner single quotes not followed by a word character
    const pattern = /(?<!\w)'(.*?)(?<!\w)'/g;

    // Replace outermost single quotes with double quotes and escape inner single quotes
    return jsonData.replace(pattern, (match, group) => '"' + group.replace(/'/g, "\\'") + '"');
}

function getOppositeColor(hex) {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Get the opposite color
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;

    // Convert r, g, b back to hex
    let rHex = r.toString(16).padStart(2, '0');
    let gHex = g.toString(16).padStart(2, '0');
    let bHex = b.toString(16).padStart(2, '0');

    // Combine them to form the final hex color
    return `#${rHex}${gHex}${bHex}`;
}

function normalizeTemplate(vega,mainField, subField, mainType, subType, value) {
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    if (mainType === 'temporal') {
        if (['date', 'Date', 'day', 'Day'].includes(mainField)) {
            return {
                "mark": { "type": "point", "filled": true },
                "transform": [{ "filter": `date(datum['${mainField}']) == ${value}` }],
                "encoding": { "color": { "value": newcolor }, "x": { "type": `${mainType}`, "field": `${mainField}` }, "y": { "type": `${subType}`, "field": `${subField}` } }
            };
        }
        if (['month', 'Month'].includes(mainField)) {
            return {
                "mark": { "type": "point", "filled": true },
                "transform": [{ "filter": `month(datum['${mainField}']) == ${value}` }],
                "encoding": { "color": { "value": newcolor }, "x": { "type": `${mainType}`, "field": `${mainField}` }, "y": { "type": `${subType}`, "field": `${subField}` } }
            };
        }
        if (['year', 'Year'].includes(mainField)) {
            return {
                "mark": { "type": "point", "filled": true },
                "transform": [{ "filter": `year(datum['${mainField}']) == ${value}` }],
                "encoding": { "color": { "value": newcolor }, "x": { "type": `${mainType}`, "field": `${mainField}` }, "y": { "type": `${subType}`, "field": `${subField}` } }
            };
        }
    }
    return {
        "mark": { "type": "point", "filled": true },
        "transform": [{ "filter": `datum['${mainField}'] == ${value}` }],
        "encoding": { "color": { "value": newcolor }, "x": { "type": `${mainType}`, "field": `${mainField}` }, "y": { "type": `${subType}`, "field": `${subField}` } }
    };
}

function lineHighlightOne(vega, mainField, subField, mainType, subType, value) {
    var newcolor = getOppositeColor(vega["encoding"]["color"]["value"]);
    vega["layer"] = [{ 'mark': vega['mark'], 'encoding': vega['encoding'] }];
    delete vega['mark'], vega['encoding'];
    if (mainType === 'temporal') {
        vega["data"]["format"] = {"type": "csv", "parse": {[mainField]: `date:'%${time_format[mainField]}'`}};
        vega["layer"].push({
            "mark": {"type": "point", "filled": true},
            "transform": [{"filter": `${normalize[mainField]}(datum['${mainField}']) == ${value}`}],
            "encoding": {
                "color": {"value": newcolor},
                "x": {"type": mainType, "field": mainField},
                "y": {"type": subType, "field": subField}
            }
        });
    } else {
        vega["layer"].push({
            "mark": {"type": "point", "filled": true},
            "transform": [{"filter": `datum['${mainField}'] == ${value}`}],
            "encoding": {
                "color": {"value": newcolor},
                "x": {"type": mainType, "field": mainField},
                "y": {"type": subType, "field": subField}
            }
        });
    }
    return vega;
}

function lineCompareTwo(vega, mainField, subField, mainType, subType, value1, value2) {
    var newcolor = getOppositeColor(vega["encoding"]["color"]["value"]);
    vega["layer"] = [{ 'mark': vega['mark'], 'encoding': vega['encoding'] }];
    delete vega['mark'], vega['encoding'];
    if (mainType === 'temporal') {
        vega["data"]["format"] = {"type": "csv", "parse": {[mainField]: `date:'%${time_format[mainField]}'`}};
        vega["layer"].push({
            "mark": {"type": "point", "filled": true},
            "transform": [{"filter": `${normalize[mainField]}(datum['${mainField}']) == ${value1} || ${normalize[mainField]}(datum['${mainField}']) == ${value2}`}],
            "encoding": {
                "color": {"value": newcolor},
                "x": {"type": mainType, "field": mainField},
                "y": {"type": subType, "field": subField}
            }
        });
    } else {
        vega["layer"].push({
            "mark": {"type": "point", "filled": true},
            "transform": [{"filter": `datum['${mainField}'] == ${value1} || datum['${mainField}'] == ${value2}`}],
            "encoding": {
                "color": {"value": newcolor},
                "x": {"type": mainType, "field": mainField},
                "y": {"type": subType, "field": subField}
            }
        });
    }
    return vega;
}

function lineThreshold(vega, subField, value) {
    var newcolor = getOppositeColor(vega["encoding"]["color"]["value"]);
    vega["layer"] = [{ 'mark': vega['mark'], 'encoding': vega['encoding'] }];
    delete vega['mark'], vega['encoding'];
    if (vega["encoding"]["x"]["field"] === subField) {
        vega["layer"].push({
            "data": {"values": [{}]},
            "mark": {"type": "rule", "color": newcolor},
            "encoding": {"x": {"datum": value}}
        });
    } else {
        vega["layer"].push({
            "data": {"values": [{}]},
            "mark": {"type": "rule", "color": newcolor},
            "encoding": {"y": {"datum": value}}
        });
    }
    return vega;
}

function lineLocalTrend(vega, mainType, value1, value2) {
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    vega["layer"] = [{ 'mark': vega['mark'], 'encoding': vega['encoding'] }];
    delete vega['mark'], vega['encoding'];
    vega["layer"].push({
        "mark": "rect",
        "data": { "values": [{ "start": `${value1}`, "end": `${value2}` }] },
        "encoding": { "x": { "field": "start", "type": `${mainType}` }, "x2": { "field": "end" }, "color": { "value": newcolor }, "opacity": { "value": 0.3 } }
    });
    return vega;
}

function lineGlobalTrend(vega, mainField, subField, mainType, subType, parsedData) {
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    vega["layer"] = [{ 'mark': vega['mark'], 'encoding': vega['encoding'] }];
    vega["layer"].push(
        {
            "data": {
                "values": [{
                    "x": parsedData[0][mainField], "y": parsedData[0][subField.replace(/\\/g, '')],
                    "x2": parsedData[parsedData.length - 1][mainField], "y2": parsedData[parsedData.length - 1][subField.replace(/\\/g, '')]
                }]
            },
            "mark": { "type": "rect", "opacity": 0.3 },
            "encoding": {
                "color": { "value": newcolor },
                "x": { "field": "x", "type": mainType }, "x2": { "field": "x2", "type": mainType },
                "y": { "field": "y", "type": subType }, "y2": { "field": "y2", "type": subType }
            }
        }
    );
    delete vega['mark'], vega['encoding'];
    return vega;
}
// {
// "mark": "rect",
// "encoding": {
//     "x": {"type": `${mainType}`, "aggregate": "min", "field": `${mainField}`},
//     "x2": {"aggregate": "max", "field": `${mainField}`},
//     "y": {"type": `${subType}`, "aggregate": "min", "field": `${subField}`},
//     "y2": {"aggregate": "max", "field": `${subField}`},
//     "color": {"value": "#aaa"},
//     "opacity": {"value": 0.5}
// }

function barHighlightOne(vega, mainField, value) {
    let oldcolor = vega["encoding"]["color"]["value"]
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    vega.encoding.color = {
        "condition": { "test": `datum['${mainField}'] == '${value}'`, "value": newcolor },
        "value": oldcolor
    };
    return vega;
}

function barCompareTwo(vega, mainField, value1, value2) {
    let oldcolor = vega["encoding"]["color"]["value"]
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    vega.encoding.color = {
        "condition": [
            { "test": `datum['${mainField}'] == '${value1}'`, "value": newcolor },
            { "test": `datum['${mainField}'] == '${value2}'`, "value": newcolor }
        ],
        "value": oldcolor
    };
    return vega;
}

function barThreshold(vega, subField, value) {
    vega.layer = [{ 'mark': vega.mark, 'encoding': vega.encoding }];
    if (vega.encoding.x.field === subField) {
        vega.layer.push({ "data": { "values": [{}] }, "mark": { "type": "rule", "color": "red" }, "encoding": { "x": { "datum": value } } });
    } else {
        vega.layer.push({ "data": { "values": [{}] }, "mark": { "type": "rule", "color": "red" }, "encoding": { "y": { "datum": value } } });
    }
    delete vega.mark, vega.encoding;
    return vega;
}

function barLocalTrend(vega, mainType, value1, value2) {
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    vega.layer = [{ 'mark': vega.mark, 'encoding': vega.encoding }];
    delete vega.mark, vega.encoding;
    vega.layer.push({
        "mark": "rect",
        "data": { "values": [{ "start": `${value1}`, "end": `${value2}` }] },
        "encoding": { "x": { "field": "start", "type": `${mainType}` }, "x2": { "field": "end" }, "color": { "value": newcolor }, "opacity": { "value": 0.5 } }
    });
    return vega;
}

function barGlobalTrend(vega, mainField, subField, mainType, subType, parsedData) {
    let newcolor = getOppositeColor(vega["encoding"]["color"]["value"])
    vega.layer = [{ 'mark': vega.mark, 'encoding': vega.encoding }];
    delete vega.mark, vega.encoding;
    if (vega.encoding.x.field === mainField) {
        vega["layer"].push(
            {
                "data": {
                    "values": [{
                        "x": parsedData[0][mainField], "y": parsedData[0][subField.replace(/\\/g, '')],
                        "x2": parsedData[parsedData.length - 1][mainField], "y2": parsedData[parsedData.length - 1][subField.replace(/\\/g, '')]
                    }]
                },
                "mark": { "type": "rect", "opacity": 0.3 },
                "encoding": {
                    "color": { "value": newcolor },
                    "x": { "field": "x", "type": mainType }, "x2": { "field": "x2", "type": mainType },
                    "y": { "field": "y", "type": subType }, "y2": { "field": "y2", "type": subType }
                }
            }
        );
    } else {
        vega["layer"].push(
            {
                "data": {
                    "values": [{
                        "y": parsedData[0][mainField], "x": parsedData[0][subField.replace(/\\/g, '')],
                        "y2": parsedData[parsedData.length - 1][mainField], "x2": parsedData[parsedData.length - 1][subField.replace(/\\/g, '')]
                    }]
                },
                "mark": { "type": "rect", "opacity": 0.3 },
                "encoding": {
                    "color": { "value": newcolor },
                    "x": { "field": "x", "type": subType }, "x2": { "field": "x2", "type": subType },
                    "y": { "field": "y", "type": mainType }, "y2": { "field": "y2", "type": mainField }
                }
            }
        );
    }
    return vega;
}

//  