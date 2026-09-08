const dialog=document.querySelector('#comparison-dialog');
const content=document.querySelector('#comparison-content');
const title=document.querySelector('#comparison-title');
document.querySelectorAll('[data-compare]').forEach(button=>{
 button.addEventListener('click',()=>{
  const study=button.closest('.damage-study');
  title.textContent=study.querySelector('h3').textContent;
  const figure=study.querySelector('figure').cloneNode(true);
  const imageButton=figure.querySelector('button');
  const picture=document.createElement('div');picture.className='expanded-picture';
  picture.append(...imageButton.childNodes);picture.querySelector('.expand-image')?.remove();imageButton.replaceWith(picture);
  const key=study.querySelector('.structure-key').cloneNode(true);
  key.classList.add('expanded-key');content.replaceChildren(figure,key);
  dialog.showModal();document.body.classList.add('comparison-open');
 });
});
document.querySelector('#close-comparison').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{document.body.classList.remove('comparison-open');content.replaceChildren();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
