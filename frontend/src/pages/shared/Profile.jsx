import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';

export default function Profile() {
  const { user } = useAuth();
  const fields = user?.role === 'doctor'
    ? [['Specialization',user?.profile?.specialization],['Qualification',user?.profile?.qualification],['Room Number',user?.profile?.room_number]]
    : [['Age',user?.profile?.age?`${user.profile.age} years`:'-'],['Gender',user?.profile?.gender||'-'],['Blood Group',user?.profile?.blood_group||'-'],['Address',user?.profile?.address||'-']];

  return (
    <Layout>
      <div className="page-header"><h2>My Profile</h2><p>Your account information</p></div>
      <div style={{maxWidth:'600px'}}>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:'20px',marginBottom:'24px'}}>
            <div style={{width:'80px',height:'80px',background:'linear-gradient(135deg,#0a6e6e,#0d8c8c)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'32px',fontWeight:700,flexShrink:0}}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 style={{fontSize:'24px',marginBottom:'8px'}}>{user?.name}</h3>
              <span className={`badge badge-${user?.role==='doctor'?'primary':'success'}`} style={{textTransform:'capitalize',fontSize:'14px',padding:'4px 14px'}}>{user?.role}</span>
            </div>
          </div>
          <div style={{borderTop:'2px solid #f0f4f8',margin:'20px 0'}} />
          <div style={{fontSize:'12px',fontWeight:700,color:'#0a6e6e',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px'}}>Account Information</div>
          {[['Full Name',user?.name],['Email',user?.email],['Phone',user?.phone||'-']].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f0f4f8'}}>
              <span style={{color:'#718096',fontSize:'14px'}}>{k}</span>
              <span style={{fontWeight:600,fontSize:'14px'}}>{v}</span>
            </div>
          ))}
          <div style={{borderTop:'2px solid #f0f4f8',margin:'20px 0'}} />
          <div style={{fontSize:'12px',fontWeight:700,color:'#0a6e6e',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px'}}>{user?.role==='doctor'?'Doctor Details':'Patient Details'}</div>
          {fields.map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f0f4f8'}}>
              <span style={{color:'#718096',fontSize:'14px'}}>{k}</span>
              <span style={{fontWeight:600,fontSize:'14px'}}>{v||'-'}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
