export function intByte(value){//小端模式
    let data = 0
    let n = value.length/2
    for(let i = value.length;i>0;i-=2){
        n--;
        data += parseInt(value.substr(i-2,2),16)*Math.pow(256,n)
    }
    return data
}
export function intByte16(value){//int转16进制
    let data = ''
    let len = 0
    let num = value
    let arr = []
    for(let i = 3;i>-1;i--){
        len = parseInt((num % Math.pow(256,i+1))/Math.pow(256,i)).toString(16)
        if(len==0){
            data += '00'
        }else if(len!=0 && len.length<2){
            data += '0'+len
        }else if(len.length==2){
            data += len
        }

    }
    for(let i=0;i<data.length;i+=2){
        arr.unshift(data.substring(i,i+2))
    }
    const str = arr.toString()
    return str.replace(/,/g,'')
}
export function writeCurrentDate() {
    var timezone = 8;
    var offset_GMT = new Date().getTimezoneOffset();
    var nowDate = new Date().getTime();
    var today = new Date(nowDate + offset_GMT * 60 * 1000 + timezone * 60 * 60 * 1000);
    var date = today.getFullYear() + "-" + twoDigits(today.getMonth() + 1) + "-" + twoDigits(today.getDate());
    var time = twoDigits(today.getHours()) + ":" + twoDigits(today.getMinutes()) + ":" + twoDigits(today.getSeconds());
    console.log( date + '  ' + time)
    return date + '  ' + time
    //设置得到当前日期的函数的执行间隔时间，每1000毫秒刷新一次。
}
function twoDigits(val) {
    if (val < 10) return "0" + val;
    return val;
}

export function fromCharCode(value){//Unicode编码转为字符
    let fileName = ''
    for(let i=0;i<value.length;i+=2){
        if(String.fromCharCode(parseInt(value.substring(i,i+2),16))!=''){
            fileName += String.fromCharCode(parseInt(value.substring(i,i+2),16))
        }
    }
    if (fileName.lastIndexOf(" ") == -1){
        fileName = fileName.substring(0,fileName.length-1);
    }
    return fileName
}