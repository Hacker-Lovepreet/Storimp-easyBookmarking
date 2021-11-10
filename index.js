const saveEl=document.getElementById("save-data")
const inputEl=document.getElementById("input-data")
const storeEl=document.getElementById("store")
let myData=[]

let data= JSON.parse(localStorage.getItem("data") )
if(data!=null){
    myData=data
    render(myData)
}

saveEl.addEventListener("click",
function(){
    myData.push(inputEl.value)
    localStorage.setItem("data",JSON.stringify(myData))
    console.log(localStorage.getItem("data"))

    render(myData)
    
}
)

function render(arr){
    let str=""
    for(let i=0;i<arr.length;i+=1){
        str +=`<li>${arr[i]}</li>`
          // <a target='_blank' href='${myData[i]}'>
            //      ${myData[i]}
            //  </a>
    }
    storeEl.innerHTML=str
    inputEl.value=""
}

const clrEl=document.getElementById("clr")

clrEl.addEventListener("click",
    function(){
        localStorage.clear()
        myData=[]
        storeEl.innerHTML=""
    }
)

const saveTab=document.getElementById("save-tab")

saveTab.addEventListener("click",
    function(){
        chrome.tabs.query({active:true,currentWindow:true}, function(tabs){
            myData.push(`<a target="_blank" href='${tabs[0].url}'>${tabs[0].url}<a>`)
            localStorage.setItem("data",JSON.stringify(myData))
            render(myData) 
        })
        
    }
)