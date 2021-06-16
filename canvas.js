import store from "@/store/index"
// import layui from "@/static/layui/layui.all"
import echarts from "echarts"
let option = null;
let myChart = null;
let index = 0;
let ctx = ''
let width = 0,height=0
let xAxisData=[];
let yAxisData=[];

let trim = ''
let timeout = 0
let wave = []
let num = 0
let poor = 0
let multiple = 0
let time1= 0,time2=0
let runstatus = ''
let count=10;//每次新增
let interval = 5;//间隔
let s=4;//画一条4秒的数据

for(let i=0 ;i<490;i++){
    xAxisData.push(i);
}
export function Drawing(){
    yAxisData=[]
    index = 0
    myChart = echarts.init(document.getElementById('main'));
    width = document.getElementById('main').clientWidth
    trim = setInterval(fn,timeout);
}
function fn(){
    updateyAxisData()//更新y轴的数据
    DrawLine();//每走一遍定时器就更新一次图
    Interval()//定时器改变速率
}
function updateyAxisData(){//更新y轴的数据
    let i = 0
    let item = []
    runstatus = store.state.deviceRunParametersInfo.runStatus
    poor = wave.length-multiple
    if(runstatus==3 || runstatus==4 || runstatus==5 || runstatus==0){
        store.state.waveDataArray = []
        wave =[]
        multiple = 0
    }else{
        wave = store.state.waveDataArray
    }
    if(wave.length>0 && poor>0){
        // multiple = store.state.multiple
        item = wave.slice(multiple,multiple+count)
    }else{
        item =[0,0,0,0,0,0,0,0,0,0]
    }
    store.state.multiple = multiple
    if(yAxisData.length>=125*s){
        while(i<count+interval){
            if(i>=count){
                yAxisData[index+num]=""
                num++;
            }else{
                num=0
                if(item[i]){
                    yAxisData[index]=item[i]
                }else{
                    yAxisData[index]=0
                }
                index++;
                if(wave.length>0 && poor>0){
                    multiple++;
                }
            }
            i++
        }
    }else{
        if(wave.length>0 && poor>0){
            yAxisData.splice(index,index+10,item[0],item[1],item[2],item[3],item[4],item[5],item[6],item[7],item[8],item[9])
        }else{
            yAxisData.splice(index,index+10,0,0,0,0,0,0,0,0,0,0)
        }
        index+=count;
        if(wave.length>0 && poor>0){
            multiple += count
        }
    }
    if(index==125*s){
        index = 0;
    }
}
function DrawLine(){
    option = {
        animation:false,
        grid: {
            height: 170,
            top: 0,
            left: 0,
            width: width,
            containLabel: false
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel: {
                interval: 10,
                show: false
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            splitLine: {
                show: false
            },
        },
        yAxis: {
            min: -2 / store.state.mv,
            max: 3 / store.state.mv,
            type: 'value',
            minInterval: 1,
            interval:1, //每次增加几个
            axisLabel: {
                show: false
            },
            axisTick: {
                show: false
            },
            axisLine: {
                show: false
            },
            splitLine: {
                show: false,
            }
        },
        series: [{
            name: "Ecg",
            type: 'line',
            data: yAxisData,
            symbol: 'none',
            lineStyle: {
                normal: {
                    width: 1,
                    color: "#000"
                }
            }
        }],
    };
    myChart.setOption(option);
}
function Interval(){//根据数据差改变速率
    time1 = localStorage.getItem('time')
    time2 = new Date().valueOf() - parseInt(time1)
    localStorage.setItem('time',new Date().valueOf())
    if(store.state.trimStop){
        clearInterval(trim)
    }else{
        poor = wave.length-multiple
        let t = 0
        if(poor>250){
            timeout = 1000/(250/(count+5))
        }else if(poor<125){
            timeout = 1000/(125/(count+5)) + (count/5 * 3)
        }else{
            timeout = 1000/(125/(count+5))
        }
        if(timeout<time2){
            t = timeout - (time2 - timeout)
        }else{
            t = timeout
        }
        clearInterval(trim)
        trim = setInterval(fn,t)
    }

}
/**绘制网格总函数
 * 分别绘制
 * drawSmallGrid小网格
 * drawMediumGrid中网格
 * drawBigGrid大网格
 */
export function drawgrid() {
    const c_canvas = document.getElementById("grids");
    drawSmallGrid(c_canvas);
    drawMediumGrid(c_canvas);
    drawBigGrid(c_canvas);
    return;
}
/**绘制小网格
 * 第一个for语句循环出纵向小方格细线条，间距为X轴方向3像素
 * 第二个for语句循环出横向小方格细线条，间距为Y轴方向3像素
 */
function drawSmallGrid(c_canvas) {
    ctx = c_canvas.getContext("2d");
    ctx.strokeStyle = "#f1dedf";
    ctx.strokeWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < 370; x += 3) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 370);
        ctx.stroke();
    }
    for (let y = 0.5; y < 370; y += 3) {
        ctx.moveTo(0, y);
        ctx.lineTo(370, y);
        ctx.stroke();
    }
    ctx.closePath();
    return;
}
/**绘制中型网格
 2  * 第一个for语句循环出纵向中方格中线条，间距为X轴方向15像素，小网格的5倍
 3  * 第二个for语句循环出横向中方格中线条，间距为Y轴方向15像素，小网格的5倍
 4  */
function drawMediumGrid(c_canvas){
    ctx = c_canvas.getContext("2d");
    ctx.strokeStyle="#fdbeb9";
    ctx.strokeWidth = 2
    //宽度是小网格的2倍
    ctx.beginPath();
    for(let x=0.5;x<370;x+=15){
        ctx.moveTo(x,0);
        ctx.lineTo(x,370);
        ctx.stroke();
    }
    for(let y=0.5;y<370;y+=15){
        ctx.moveTo(0,y);
        ctx.lineTo(370,y);
        ctx.stroke();
    }
    ctx.closePath();
    return;
}
/**绘制大型网格
 * 第一个for语句循环出纵向大方格中线条，间距为X轴方向75像素，小网格的5倍
 * 第二个for语句循环出横向大方格中线条，间距为Y轴方向75像素，小网格的5倍
 */
function drawBigGrid(c_canvas) {
    ctx = c_canvas.getContext("2d");
    ctx.strokeStyle = "#e0514b";
    ctx.strokeWidth = 3;
    ctx.beginPath();
    for (let x = 0.5; x < 370; x += 75) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 370);
        ctx.stroke();
    }
    for (let y = 0.5; y < 370; y += 60) {
        ctx.moveTo(0, y);
        ctx.lineTo(370, y);
        ctx.stroke();
    }
    // ctx.fillText("time/ms",offsetx+width/2,220);
    // ctx.fillText("0",offsetx,220);
    // ctx.fillText("10000",offsetx+width*49/50,220);
    height = document.getElementById('main').clientHeight
    document.getElementById('ruler').style.height = height/5
    document.getElementById('ruler').style.top = ((height/5)*2)-25
    // ctx.fillText("1.0mv",0,height/5*2-25);
    // ctx.fillText("0",0,height/5*3-40);
    // ctx.fillText("-1.0mv",0,(height/5)*4-55);

    ctx.closePath();
    return;
}
